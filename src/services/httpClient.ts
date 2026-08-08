import { appConfig, defaultHeaders } from '../config/env'
import { ApiError, toApiError } from './apiError'

export interface RequestOptions {
  readonly method?: 'GET' | 'POST'
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
}

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${appConfig.apiBaseUrl}${normalized}`
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

/** 组合外部 signal 与超时 signal，任意一个触发都会中断请求。 */
function withTimeout(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)

  const onExternalAbort = () => controller.abort(external?.reason)
  if (external) {
    if (external.aborted) onExternalAbort()
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

/**
 * 所有 HTTP 出口的唯一入口：注入默认头、统一超时、统一错误归一化。
 * 成功时返回未校验的原始 JSON，交由 zod schema 在调用方做边界校验。
 */
export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, timeoutMs } = options
  const timeout = withTimeout(timeoutMs ?? appConfig.requestTimeoutMs, signal)

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: defaultHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeout.signal,
    })

    const payload = await readPayload(response)

    if (!response.ok) {
      throw toApiError(response.status, payload)
    }

    return payload as T
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error

    if (signal?.aborted) {
      throw new ApiError({
        kind: 'network',
        status: 0,
        code: 'REQUEST_ABORTED',
        message: '请求已取消',
      })
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError({
        kind: 'timeout',
        status: 0,
        code: 'REQUEST_TIMEOUT',
        message: `请求超时（>${timeoutMs ?? appConfig.requestTimeoutMs}ms），请检查代理与上游服务`,
      })
    }

    throw new ApiError({
      kind: 'network',
      status: 0,
      code: 'NETWORK_ERROR',
      message: '无法连接到策略服务，请确认代理配置是否生效',
    })
  } finally {
    timeout.cleanup()
  }
}
