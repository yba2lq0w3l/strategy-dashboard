/**
 * 统一的 API 错误模型。
 *
 * 上游存在三种错误载荷形态（实测）：
 * 1. 业务错误：{ code, message, details, trace_id }
 * 2. FastAPI 校验错误：{ detail: [{ loc, msg, ... }] }
 * 3. 框架错误：{ detail: "Method Not Allowed" }
 */

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly code: string
  readonly traceId: string | null

  constructor(params: {
    kind: ApiErrorKind
    status: number
    code: string
    message: string
    traceId?: string | null
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.kind = params.kind
    this.status = params.status
    this.code = params.code
    this.traceId = params.traceId ?? null
  }

  /** 状态机冲突（如对已终止策略执行暂停），UI 需要提示而非报警。 */
  get isConflict(): boolean {
    return this.status === 409
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatValidationDetail(detail: readonly unknown[]): string {
  const messages = detail
    .map((entry) => {
      if (!isRecord(entry)) return null
      const loc = Array.isArray(entry.loc) ? entry.loc.join('.') : ''
      const msg = typeof entry.msg === 'string' ? entry.msg : '参数非法'
      return loc ? `${loc}: ${msg}` : msg
    })
    .filter((value): value is string => value !== null)

  return messages.length > 0 ? messages.join('; ') : '请求参数校验失败'
}

/** 把任意错误载荷归一化为可直接展示给用户的 ApiError。 */
export function toApiError(status: number, payload: unknown): ApiError {
  if (isRecord(payload)) {
    if (typeof payload.message === 'string' && payload.message.length > 0) {
      return new ApiError({
        kind: 'http',
        status,
        code: typeof payload.code === 'string' ? payload.code : `HTTP_${status}`,
        message: payload.message,
        traceId: typeof payload.trace_id === 'string' ? payload.trace_id : null,
      })
    }

    if (Array.isArray(payload.detail)) {
      return new ApiError({
        kind: 'http',
        status,
        code: 'VALIDATION_ERROR',
        message: formatValidationDetail(payload.detail),
      })
    }

    if (typeof payload.detail === 'string') {
      return new ApiError({
        kind: 'http',
        status,
        code: `HTTP_${status}`,
        message: payload.detail,
      })
    }
  }

  return new ApiError({
    kind: 'http',
    status,
    code: `HTTP_${status}`,
    message: `请求失败（HTTP ${status}）`,
  })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '发生未知错误'
}
