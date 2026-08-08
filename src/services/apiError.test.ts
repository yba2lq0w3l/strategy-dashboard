import { describe, expect, it } from 'vitest'
import { ApiError, getErrorMessage, toApiError } from './apiError'

describe('toApiError', () => {
  it('解析业务错误载荷', () => {
    const error = toApiError(400, {
      code: 'INVALID_REQUEST',
      message: "策略参数非法：max_leverage 不是合法数值: '3x'",
      details: null,
      trace_id: 'trc_7f6e4db4',
    })

    expect(error.code).toBe('INVALID_REQUEST')
    expect(error.message).toContain('max_leverage')
    expect(error.traceId).toBe('trc_7f6e4db4')
    expect(error.status).toBe(400)
  })

  it('解析 FastAPI 校验错误数组', () => {
    const error = toApiError(422, {
      detail: [
        { type: 'missing', loc: ['body', 'allocation'], msg: 'Field required' },
      ],
    })

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('body.allocation: Field required')
  })

  it('校验错误数组为空时给出兜底文案', () => {
    expect(toApiError(422, { detail: [] }).message).toBe('请求参数校验失败')
  })

  it('解析字符串 detail', () => {
    expect(toApiError(405, { detail: 'Method Not Allowed' }).message).toBe(
      'Method Not Allowed',
    )
  })

  it('无法识别的载荷回落到 HTTP 状态描述', () => {
    const error = toApiError(500, 'boom')
    expect(error.code).toBe('HTTP_500')
    expect(error.message).toContain('500')
  })

  it('409 被标记为状态机冲突', () => {
    const error = toApiError(409, {
      code: 'INVALID_REQUEST',
      message: '仅 ACTIVE 可暂停',
    })
    expect(error.isConflict).toBe(true)
    expect(toApiError(400, {}).isConflict).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('识别 ApiError / Error / 未知值', () => {
    expect(
      getErrorMessage(
        new ApiError({ kind: 'http', status: 400, code: 'X', message: '坏了' }),
      ),
    ).toBe('坏了')
    expect(getErrorMessage(new Error('普通错误'))).toBe('普通错误')
    expect(getErrorMessage('字符串')).toBe('发生未知错误')
  })
})
