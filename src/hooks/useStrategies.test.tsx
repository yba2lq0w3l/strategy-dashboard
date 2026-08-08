import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStrategies, type StrategyEvent } from './useStrategies'
import { ApiError } from '../services/apiError'
import { makeStrategy } from '../test/fixtures'

const listMock = vi.fn()
const pauseMock = vi.fn()
const resumeMock = vi.fn()
const terminateMock = vi.fn()
const createMock = vi.fn()
const allocateMock = vi.fn()

vi.mock('../services/api', () => ({
  strategyApi: {
    list: (...args: unknown[]) => listMock(...args),
    pause: (...args: unknown[]) => pauseMock(...args),
    resume: (...args: unknown[]) => resumeMock(...args),
    terminate: (...args: unknown[]) => terminateMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    allocate: (...args: unknown[]) => allocateMock(...args),
  },
}))

const strategy = makeStrategy()

beforeEach(() => {
  listMock.mockReset()
  pauseMock.mockReset()
  resumeMock.mockReset()
  terminateMock.mockReset()
  createMock.mockReset()
  allocateMock.mockReset()
  listMock.mockResolvedValue({ strategies: [strategy], skipped: 0 })
})

/** 关闭轮询（intervalMs = 0），测试只驱动一次首屏加载。 */
function renderStrategies(onEvent?: (event: StrategyEvent) => void) {
  return renderHook(() => useStrategies({ intervalMs: 0, onEvent }))
}

describe('useStrategies 首屏加载', () => {
  it('加载成功后进入 online 并记录同步时间', async () => {
    const { result } = renderStrategies()

    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(result.current.strategies).toHaveLength(1)
    expect(result.current.lastSyncAt).not.toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('首次失败标记 offline 并派发错误事件', async () => {
    listMock.mockRejectedValue(new Error('boom'))
    const onEvent = vi.fn()
    const { result } = renderStrategies(onEvent)

    await waitFor(() => expect(result.current.status).toBe('offline'))
    expect(result.current.error).toBe('boom')
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error', source: 'SYNC' }),
    )
  })

  it('已有数据后失败降级为 degraded 且保留旧快照', async () => {
    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    listMock.mockRejectedValue(new Error('网络抖动'))
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('degraded')
    expect(result.current.strategies).toHaveLength(1)
  })

  it('跳过脏数据时发出告警事件', async () => {
    listMock.mockResolvedValue({ strategies: [strategy], skipped: 2 })
    const onEvent = vi.fn()
    const { result } = renderStrategies(onEvent)

    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warn', source: 'PARSER' }),
    )
  })

  it('StrictMode 双挂载下仍能完成首屏加载', async () => {
    // 回归用例：曾因「重挂载前 abort + 重叠请求跳过」导致一个请求都不成功，
    // 页面永远停在 CONNECTING。必须让 mock 具备真实的异步时序并响应 abort，
    // 否则立即 resolve 的 Promise 会掩盖这个竞态。
    listMock.mockImplementation(
      (signal?: AbortSignal) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => resolve({ strategies: [strategy], skipped: 0 }),
            20,
          )
          signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(
              new ApiError({
                kind: 'network',
                status: 0,
                code: 'REQUEST_ABORTED',
                message: '请求已取消',
              }),
            )
          })
        }),
    )

    const { result } = renderHook(() => useStrategies({ intervalMs: 0 }), {
      wrapper: StrictMode,
    })

    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(result.current.strategies).toHaveLength(1)
  })

  it('请求被取消时不改变状态', async () => {
    listMock.mockRejectedValue(
      new ApiError({
        kind: 'network',
        status: 0,
        code: 'REQUEST_ABORTED',
        message: '请求已取消',
      }),
    )

    const { result } = renderStrategies()
    await waitFor(() => expect(listMock).toHaveBeenCalled())
    expect(result.current.error).toBeNull()
  })
})

describe('useStrategies 控制指令', () => {
  it('暂停成功后就地更新该策略状态', async () => {
    pauseMock.mockResolvedValue({ ...strategy, state: 'paused', version: 2 })
    const onEvent = vi.fn()
    const { result } = renderStrategies(onEvent)
    await waitFor(() => expect(result.current.status).toBe('online'))

    let outcome = false
    await act(async () => {
      outcome = await result.current.runAction(strategy.strategyId, 'pause')
    })

    expect(outcome).toBe(true)
    expect(result.current.strategies[0].state).toBe('paused')
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'success', source: 'CONTROL' }),
    )
  })

  it('409 冲突以 warn 级别上报且返回 false', async () => {
    pauseMock.mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'INVALID_REQUEST',
        message: '仅 ACTIVE 可暂停',
      }),
    )
    const onEvent = vi.fn()
    const { result } = renderStrategies(onEvent)
    await waitFor(() => expect(result.current.status).toBe('online'))

    let outcome = true
    await act(async () => {
      outcome = await result.current.runAction(strategy.strategyId, 'pause')
    })

    expect(outcome).toBe(false)
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warn' }),
    )
  })

  it('执行期间把策略标记为 pending，结束后清除', async () => {
    let release: (value: unknown) => void = () => {}
    resumeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )

    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    let pending: Promise<boolean> | null = null
    act(() => {
      pending = result.current.runAction(strategy.strategyId, 'resume')
    })

    await waitFor(() =>
      expect(result.current.pendingIds.has(strategy.strategyId)).toBe(true),
    )

    await act(async () => {
      release({ ...strategy, state: 'active' })
      await pending
    })

    expect(result.current.pendingIds.has(strategy.strategyId)).toBe(false)
  })
})

describe('useStrategies 创建与资金调整', () => {
  it('创建成功后把新策略插入列表头部', async () => {
    const created = makeStrategy({ strategyId: 'strat_new', name: 'New One' })
    createMock.mockResolvedValue(created)

    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    await act(async () => {
      await result.current.createStrategy({
        name: 'New One',
        templateId: 'tpl_demo',
        runtimeEnv: 'paper',
        allocation: '1000',
        capitalCapacity: '2000',
        strategyCapacity: '3000',
        maxLeverage: '2',
      })
    })

    expect(result.current.strategies[0].strategyId).toBe('strat_new')
  })

  it('创建失败向上抛出，供表单展示错误', async () => {
    createMock.mockRejectedValue(new Error('部署被拒绝'))
    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    await expect(
      act(async () => {
        await result.current.createStrategy({
          name: 'X',
          templateId: 't',
          runtimeEnv: 'paper',
          allocation: '1',
          capitalCapacity: '2',
          strategyCapacity: '3',
          maxLeverage: '1',
        })
      }),
    ).rejects.toThrow('部署被拒绝')
  })

  it('资金调整成功后更新分配额度', async () => {
    allocateMock.mockResolvedValue({ ...strategy, allocation: '20000' })
    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    let outcome = false
    await act(async () => {
      outcome = await result.current.allocate(strategy.strategyId, '20000')
    })

    expect(outcome).toBe(true)
    expect(result.current.strategies[0].allocation).toBe('20000')
  })

  it('资金调整失败返回 false', async () => {
    allocateMock.mockRejectedValue(new Error('超出容量'))
    const { result } = renderStrategies()
    await waitFor(() => expect(result.current.status).toBe('online'))

    let outcome = true
    await act(async () => {
      outcome = await result.current.allocate(strategy.strategyId, '999999')
    })

    expect(outcome).toBe(false)
  })
})
