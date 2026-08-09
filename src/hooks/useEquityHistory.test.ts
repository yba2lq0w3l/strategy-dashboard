import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEquityHistory } from './useEquityHistory'
import type { EquityRange, EquitySeries } from '../types/equity'

const equityMock = vi.fn()

vi.mock('../services/api', () => ({
  strategyApi: { equityHistory: (...args: unknown[]) => equityMock(...args) },
}))

function seriesWith(equity: number): EquitySeries {
  return {
    points: [{ timestamp: 1_000, equity, pnl: 0, drawdownPct: 0 }],
    summary: {
      baseEquity: equity,
      finalEquity: equity,
      totalPnl: 0,
      totalPnlPct: 0,
      maxDrawdownPct: 0,
    },
  }
}

beforeEach(() => {
  equityMock.mockReset()
  equityMock.mockResolvedValue(seriesWith(10_000))
})

describe('useEquityHistory', () => {
  it('首屏用传入的窗口拉取曲线', async () => {
    const { result } = renderHook(() =>
      useEquityHistory({ range: '6h', intervalMs: 0 }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(equityMock).toHaveBeenCalledWith('6h')
    expect(result.current.series.points).toHaveLength(1)
  })

  it('切换窗口立即重新拉取，不等下一个轮询周期', async () => {
    const { result, rerender } = renderHook(
      ({ range }: { range: EquityRange }) =>
        useEquityHistory({ range, intervalMs: 0 }),
      { initialProps: { range: '6h' as EquityRange } },
    )

    await waitFor(() => expect(equityMock).toHaveBeenCalledWith('6h'))

    rerender({ range: '24h' as EquityRange })

    await waitFor(() => expect(equityMock).toHaveBeenCalledWith('24h'))
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('轮询关闭时切换窗口依然生效', async () => {
    // 回归用例：此前「在途则跳过」会把切换请求丢掉，
    // 轮询关闭时曲线将永远停留在旧窗口。
    let release: ((value: EquitySeries) => void) | null = null
    equityMock.mockImplementationOnce(
      () => new Promise<EquitySeries>((resolve) => { release = resolve }),
    )
    equityMock.mockResolvedValue(seriesWith(20_000))

    const { result, rerender } = renderHook(
      ({ range }: { range: EquityRange }) =>
        useEquityHistory({ range, intervalMs: 0 }),
      { initialProps: { range: '6h' as EquityRange } },
    )

    // 首个请求仍在飞的时候切换窗口
    rerender({ range: '24h' as EquityRange })
    await waitFor(() => expect(equityMock).toHaveBeenCalledWith('24h'))

    await act(async () => {
      release?.(seriesWith(10_000))
    })

    // 先发的 6h 响应不能覆盖后发的 24h 结果
    await waitFor(() =>
      expect(result.current.series.summary?.finalEquity).toBe(20_000),
    )
  })

  it('旧窗口的迟到响应不覆盖新窗口的数据', async () => {
    let releaseSlow: ((value: EquitySeries) => void) | null = null
    equityMock.mockImplementationOnce(
      () => new Promise<EquitySeries>((resolve) => { releaseSlow = resolve }),
    )
    equityMock.mockResolvedValueOnce(seriesWith(33_000))

    const { result, rerender } = renderHook(
      ({ range }: { range: EquityRange }) =>
        useEquityHistory({ range, intervalMs: 0 }),
      { initialProps: { range: '1h' as EquityRange } },
    )

    rerender({ range: '24h' as EquityRange })
    await waitFor(() =>
      expect(result.current.series.summary?.finalEquity).toBe(33_000),
    )

    await act(async () => {
      releaseSlow?.(seriesWith(11_111))
    })

    expect(result.current.series.summary?.finalEquity).toBe(33_000)
  })

  it('失败时上报错误并保留上一份曲线，避免大屏闪空', async () => {
    const onError = vi.fn()
    const { result, rerender } = renderHook(
      ({ range }: { range: EquityRange }) =>
        useEquityHistory({ range, intervalMs: 0, onError }),
      { initialProps: { range: '6h' as EquityRange } },
    )

    await waitFor(() => expect(result.current.series.points).toHaveLength(1))

    equityMock.mockRejectedValue(new Error('上游超时'))
    rerender({ range: '24h' as EquityRange })

    await waitFor(() => expect(result.current.error).toBe('上游超时'))
    expect(onError).toHaveBeenCalledWith('上游超时')
    expect(result.current.series.points).toHaveLength(1)
  })

  it('手动 refresh 可再次拉取', async () => {
    const { result } = renderHook(() =>
      useEquityHistory({ range: '1h', intervalMs: 0 }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    equityMock.mockClear()

    await act(async () => {
      await result.current.refresh()
    })

    expect(equityMock).toHaveBeenCalledWith('1h')
  })
})
