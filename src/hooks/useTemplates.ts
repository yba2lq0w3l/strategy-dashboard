import { useCallback, useEffect, useRef, useState } from 'react'
import { strategyApi } from '../services/api'
import { ApiError, getErrorMessage } from '../services/apiError'
import type { StrategyTemplate } from '../types/template'

export interface UseTemplatesResult {
  readonly templates: readonly StrategyTemplate[]
  readonly loading: boolean
  readonly error: string | null
  reload: () => Promise<void>
}

/**
 * 官方策略模板。模板是静态目录，不参与轮询——只在首次需要时加载一次，
 * 失败时由调用方提供重试入口。
 */
export function useTemplates(enabled: boolean): UseTemplatesResult {
  const [templates, setTemplates] = useState<readonly StrategyTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const loadedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await strategyApi.listTemplates()
      if (!mountedRef.current) return
      setTemplates(result.templates)
      loadedRef.current = true
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'REQUEST_ABORTED') return
      if (!mountedRef.current) return
      setError(getErrorMessage(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // 打开模板面板时才拉取；已经成功加载过就不再重复请求。
  useEffect(() => {
    if (!enabled || loadedRef.current) return
    void load()
  }, [enabled, load])

  return { templates, loading, error, reload: load }
}
