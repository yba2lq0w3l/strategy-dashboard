import { useCallback, useEffect, useRef, useState } from 'react'
import { strategyApi } from '../services/api'
import { ApiError, getErrorMessage } from '../services/apiError'
import type {
  CreateStrategyInput,
  Strategy,
  StrategyAction,
} from '../types/strategy'
import { useInterval } from './useInterval'

export type ConnectionStatus = 'connecting' | 'online' | 'degraded' | 'offline'

export interface StrategyEvent {
  readonly level: 'info' | 'success' | 'warn' | 'error'
  readonly source: string
  readonly message: string
}

interface StrategiesState {
  readonly strategies: readonly Strategy[]
  readonly status: ConnectionStatus
  readonly error: string | null
  readonly lastSyncAt: number | null
  readonly skipped: number
  readonly isRefreshing: boolean
}

const INITIAL_STATE: StrategiesState = {
  strategies: [],
  status: 'connecting',
  error: null,
  lastSyncAt: null,
  skipped: 0,
  isRefreshing: false,
}

export interface UseStrategiesOptions {
  readonly intervalMs: number
  readonly onEvent?: (event: StrategyEvent) => void
}

export interface UseStrategiesResult extends StrategiesState {
  readonly pendingIds: ReadonlySet<string>
  refresh: () => Promise<void>
  runAction: (strategyId: string, action: StrategyAction) => Promise<boolean>
  createStrategy: (input: CreateStrategyInput) => Promise<Strategy | null>
  allocate: (strategyId: string, allocation: string) => Promise<boolean>
}

const ACTION_LABELS: Record<StrategyAction, string> = {
  pause: '暂停',
  resume: '恢复',
  terminate: '终止',
}

/**
 * 策略数据源：负责轮询、乐观更新与错误分级。
 *
 * 错误分级说明：已经拿到过数据后再失败标记为 `degraded`（保留旧数据继续展示，
 * 大屏不白屏）；从未成功过才标记 `offline`。
 */
export function useStrategies(
  options: UseStrategiesOptions,
): UseStrategiesResult {
  const { intervalMs, onEvent } = options
  const [state, setState] = useState<StrategiesState>(INITIAL_STATE)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())

  const inFlightRef = useRef(false)
  const mountedRef = useRef(true)
  const eventRef = useRef(onEvent)

  useEffect(() => {
    eventRef.current = onEvent
  }, [onEvent])

  const emit = useCallback((event: StrategyEvent) => {
    eventRef.current?.(event)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    // 轮询间隔可能短于单次请求耗时，跳过重叠请求避免请求堆积。
    if (inFlightRef.current) return
    inFlightRef.current = true

    setState((prev) => ({ ...prev, isRefreshing: true }))

    // 刻意不在这里中断在途请求：StrictMode 的挂载→卸载→再挂载会先取消首个
    // 请求，而重挂载后的请求又会被上面的重叠保护跳过，结果一个都不成功、
    // 页面永远停在 CONNECTING。这里让请求跑完，仅在写入状态前用 mountedRef 兜底。
    try {
      const result = await strategyApi.list()
      if (!mountedRef.current) return

      setState((prev) => ({
        ...prev,
        strategies: result.strategies,
        skipped: result.skipped,
        status: 'online',
        error: null,
        lastSyncAt: Date.now(),
        isRefreshing: false,
      }))

      if (result.skipped > 0) {
        emit({
          level: 'warn',
          source: 'PARSER',
          message: `${result.skipped} 条策略数据格式异常，已跳过`,
        })
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'REQUEST_ABORTED') return
      if (!mountedRef.current) return

      const message = getErrorMessage(error)
      setState((prev) => ({
        ...prev,
        status: prev.lastSyncAt === null ? 'offline' : 'degraded',
        error: message,
        isRefreshing: false,
      }))
      emit({ level: 'error', source: 'SYNC', message })
    } finally {
      inFlightRef.current = false
    }
  }, [emit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useInterval(() => {
    void refresh()
  }, intervalMs)

  const withPending = useCallback(
    async <T,>(strategyId: string, task: () => Promise<T>): Promise<T | null> => {
      setPendingIds((prev) => new Set(prev).add(strategyId))
      try {
        return await task()
      } finally {
        if (mountedRef.current) {
          setPendingIds((prev) => {
            const next = new Set(prev)
            next.delete(strategyId)
            return next
          })
        }
      }
    },
    [],
  )

  const applyStrategy = useCallback((updated: Strategy) => {
    setState((prev) => ({
      ...prev,
      strategies: prev.strategies.some(
        (item) => item.strategyId === updated.strategyId,
      )
        ? prev.strategies.map((item) =>
            item.strategyId === updated.strategyId ? updated : item,
          )
        : [updated, ...prev.strategies],
      lastSyncAt: Date.now(),
    }))
  }, [])

  const runAction = useCallback(
    async (strategyId: string, action: StrategyAction): Promise<boolean> => {
      const label = ACTION_LABELS[action]
      const result = await withPending(strategyId, async () => {
        try {
          const updated = await strategyApi[action](strategyId)
          applyStrategy(updated)
          emit({
            level: 'success',
            source: 'CONTROL',
            message: `${label}成功 · ${updated.name} → ${updated.state.toUpperCase()}`,
          })
          return true
        } catch (error: unknown) {
          const message = getErrorMessage(error)
          emit({
            level: error instanceof ApiError && error.isConflict ? 'warn' : 'error',
            source: 'CONTROL',
            message: `${label}失败 · ${message}`,
          })
          return false
        }
      })
      return result ?? false
    },
    [applyStrategy, emit, withPending],
  )

  const createStrategy = useCallback(
    async (input: CreateStrategyInput): Promise<Strategy | null> => {
      try {
        const created = await strategyApi.create(input)
        applyStrategy(created)
        emit({
          level: 'success',
          source: 'DEPLOY',
          message: `策略已部署 · ${created.name} (${created.runtimeEnv})`,
        })
        return created
      } catch (error: unknown) {
        const message = getErrorMessage(error)
        emit({ level: 'error', source: 'DEPLOY', message: `部署失败 · ${message}` })
        throw error
      }
    },
    [applyStrategy, emit],
  )

  const allocate = useCallback(
    async (strategyId: string, allocation: string): Promise<boolean> => {
      const result = await withPending(strategyId, async () => {
        try {
          const updated = await strategyApi.allocate(strategyId, allocation)
          applyStrategy(updated)
          emit({
            level: 'success',
            source: 'CAPITAL',
            message: `资金已调整 · ${updated.name} → ${updated.allocation}`,
          })
          return true
        } catch (error: unknown) {
          emit({
            level: 'error',
            source: 'CAPITAL',
            message: `调整资金失败 · ${getErrorMessage(error)}`,
          })
          return false
        }
      })
      return result ?? false
    },
    [applyStrategy, emit, withPending],
  )

  return { ...state, pendingIds, refresh, runAction, createStrategy, allocate }
}
