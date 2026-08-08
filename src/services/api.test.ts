import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { strategyApi } from './api'
import { ApiError } from './apiError'
import { rawStrategy } from '../test/fixtures'

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  } as unknown as Response
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastCall(): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit]
}

describe('strategyApi.list', () => {
  it('请求列表并注入默认头', async () => {
    fetchMock.mockResolvedValue(mockResponse({ items: [rawStrategy] }))

    const result = await strategyApi.list()
    const [url, init] = lastCall()

    expect(url).toBe('/api/v1/agent/strategies')
    expect(init.method).toBe('GET')
    expect(init.headers).toMatchObject({
      'X-User-Id': 'u_dev',
      'X-Agent-Id': 'agent-test-001',
      'Content-Type': 'application/json',
    })
    expect(result.strategies).toHaveLength(1)
  })
})

describe('strategyApi.findById', () => {
  it('对 ID 做 URL 编码', async () => {
    fetchMock.mockResolvedValue(mockResponse(rawStrategy))

    await strategyApi.findById('strat/with space')
    expect(lastCall()[0]).toBe('/api/v1/agent/strategies/strat%2Fwith%20space')
  })
})

describe('strategyApi.create', () => {
  it('把领域输入转换为 snake_case 请求体', async () => {
    fetchMock.mockResolvedValue(mockResponse(rawStrategy, 201))

    await strategyApi.create({
      name: 'Alpha',
      templateId: 'tpl_demo',
      runtimeEnv: 'paper',
      allocation: '10000',
      capitalCapacity: '50000',
      strategyCapacity: '100000',
      maxLeverage: '3',
    })

    const [, init] = lastCall()
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Alpha',
      template_id: 'tpl_demo',
      runtime_env: 'paper',
      allocation: '10000',
      capital_capacity: '50000',
      strategy_capacity: '100000',
      max_leverage: '3',
    })
  })

  it('可选字段为空时不出现在请求体中', async () => {
    fetchMock.mockResolvedValue(mockResponse(rawStrategy, 201))

    await strategyApi.create({
      name: 'Alpha',
      templateId: 'tpl_demo',
      runtimeEnv: 'live',
      allocation: '1',
      capitalCapacity: '2',
      strategyCapacity: '3',
      maxLeverage: '2',
      allowedAssets: ['BTC'],
      expiresAt: '2026-12-31T00:00:00Z',
    })

    const body = JSON.parse(String(lastCall()[1].body))
    expect(body.allowed_assets).toEqual(['BTC'])
    expect(body.expires_at).toBe('2026-12-31T00:00:00Z')
  })
})

describe('strategyApi 控制指令', () => {
  it.each([
    ['pause', 'PAUSED'],
    ['resume', 'ACTIVE'],
    ['terminate', 'TERMINATED'],
  ] as const)('%s 调用对应端点', async (command, state) => {
    fetchMock.mockResolvedValue(mockResponse({ ...rawStrategy, state }))

    const updated = await strategyApi[command]('strat_1')
    const [url, init] = lastCall()

    expect(url).toBe(`/api/v1/agent/strategies/strat_1/${command}`)
    expect(init.method).toBe('POST')
    expect(updated.state).toBe(state.toLowerCase())
  })

  it('allocate 提交 allocation 字段', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ...rawStrategy, allocation: '20000' }),
    )

    const updated = await strategyApi.allocate('strat_1', '20000')
    expect(JSON.parse(String(lastCall()[1].body))).toEqual({
      allocation: '20000',
    })
    expect(updated.allocation).toBe('20000')
  })

  it('把上游 409 冲突转成 ApiError', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        { code: 'INVALID_REQUEST', message: '仅 ACTIVE 可暂停' },
        409,
      ),
    )

    await expect(strategyApi.pause('strat_1')).rejects.toBeInstanceOf(ApiError)
  })
})
