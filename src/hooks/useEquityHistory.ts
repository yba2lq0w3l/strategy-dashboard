import { useCallback, useEffect, useRef, useState } from 'react'
import { strategyApi } from '../services/api'
import { ApiError, getErrorMessage } from '../services/apiError'
import type { EquityRange, EquitySeries } from '../types/equity'
import { useInterval } from './useInterval'

const EMPTY_SERIES: EquitySeries = { points: [], summary: null }

export interface UseEquityHistoryOptions {
  readonly range: EquityRange
  readonly intervalMs: number
  readonly onError?: (message: string) => void
}

export interface UseEquityHistoryResult {
  readonly series: EquitySeries
  readonly loading: boolean
  readonly error: string | null
  refresh: () => Promise<void>
}

/**
 * 权益曲线数据源。与 useStrategies 共用同一套可靠性约定：
 * 重叠请求跳过、卸载后不写状态、失败保留上一份曲线（避免大屏闪空）。
 */
export function useEquityHistory(
  options: UseEquityHistoryOptions,
): UseEquityHistoryResult {
  const { range, intervalMs, onError } = options
  const [series, setSeries] = useState<EquitySeries>(EMPTY_SERIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const rangeRef = useRef(range)
  const errorRef = useRef(onError)

  useEffect(() => {
    rangeRef.current = range
  }, [range])

  useEffect(() => {
    errorRef.current = onError
  }, [onError])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * 用递增的请求序号而不是「在途则跳过」来处理并发：
   * 跳过会把用户切换时间窗口的操作静默丢掉（轮询关闭时更是永远不刷新），
   * 而序号既能保证只有最新一次请求的结果落地，也不会丢失任何一次显式请求。
   */
  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    const isStale = () => !mountedRef.current || requestId !== requestIdRef.current

    try {
      const result = await strategyApi.equityHistory(rangeRef.current)
      if (isStale()) return
      setSeries(result)
      setError(null)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'REQUEST_ABORTED') return
      if (isStale()) return

      const message = getErrorMessage(err)
      setError(message)
      errorRef.current?.(message)
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [])

  // 切换时间窗口要立刻重新拉取，不能等下一个轮询周期。
  useEffect(() => {
    setLoading(true)
    void load()
  }, [load, range])

  useInterval(() => {
    void load()
  }, intervalMs)

  return { series, loading, error, refresh: load }
}
