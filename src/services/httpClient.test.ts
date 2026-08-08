import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './httpClient'
import { ApiError } from './apiError'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function response(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response
}

describe('request', () => {
  it('拼接 base url 并解析 JSON', async () => {
    fetchMock.mockResolvedValue(response('{"ok":true}'))
    await expect(request('/v1/ping')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/ping')
  })

  it('自动补全缺失的前导斜杠', async () => {
    fetchMock.mockResolvedValue(response('{}'))
    await request('v1/ping')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/ping')
  })

  it('空响应体返回 null', async () => {
    fetchMock.mockResolvedValue(response(''))
    await expect(request('/v1/ping')).resolves.toBeNull()
  })

  it('非 JSON 响应体原样返回文本', async () => {
    fetchMock.mockResolvedValue(response('plain text'))
    await expect(request('/v1/ping')).resolves.toBe('plain text')
  })

  it('GET 请求不带 body', async () => {
    fetchMock.mockResolvedValue(response('{}'))
    await request('/v1/ping')
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it('网络异常转成 NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/v1/ping')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      kind: 'network',
    })
  })

  it('AbortError 转成超时错误', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    fetchMock.mockRejectedValue(abortError)

    await expect(request('/v1/ping')).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      kind: 'timeout',
    })
  })

  it('外部 signal 已取消时抛出 REQUEST_ABORTED', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockRejectedValue(new Error('aborted'))

    await expect(
      request('/v1/ping', { signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'REQUEST_ABORTED' })
  })

  it('HTTP 错误保留上游 message 与 trace_id', async () => {
    fetchMock.mockResolvedValue(
      response(
        JSON.stringify({
          code: 'SESSION_NOT_FOUND',
          message: '策略不存在',
          trace_id: 'trc_1',
        }),
        404,
      ),
    )

    const error = await request('/v1/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('策略不存在')
    expect((error as ApiError).traceId).toBe('trc_1')
  })
})
