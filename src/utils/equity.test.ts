import { describe, expect, it } from 'vitest'
import { buildEquitySeries } from './equity'

const END_TIME = Date.parse('2026-08-08T12:00:00Z')

describe('buildEquitySeries', () => {
  it('生成指定数量的点', () => {
    const series = buildEquitySeries({
      seed: 'a',
      baseCapital: 100_000,
      points: 48,
      endTime: END_TIME,
    })

    expect(series.points).toHaveLength(48)
  })

  it('同一 seed 产出完全一致的曲线（避免大屏抖动）', () => {
    const params = { seed: 'stable', baseCapital: 50_000, endTime: END_TIME }
    const first = buildEquitySeries(params)
    const second = buildEquitySeries(params)

    expect(first.points).toEqual(second.points)
    expect(first.totalPnl).toBe(second.totalPnl)
  })

  it('不同 seed 产出不同曲线', () => {
    const a = buildEquitySeries({ seed: 'a', baseCapital: 50_000, endTime: END_TIME })
    const b = buildEquitySeries({ seed: 'b', baseCapital: 50_000, endTime: END_TIME })

    expect(a.finalEquity).not.toBe(b.finalEquity)
  })

  it('首点等于基准资金，末点时间戳等于 endTime', () => {
    const series = buildEquitySeries({
      seed: 'x',
      baseCapital: 20_000,
      points: 10,
      intervalMs: 60_000,
      endTime: END_TIME,
    })

    expect(series.points[0].equity).toBe(20_000)
    expect(series.points[0].pnl).toBe(0)
    expect(series.points.at(-1)?.timestamp).toBe(END_TIME)
    expect(series.points[0].timestamp).toBe(END_TIME - 9 * 60_000)
  })

  it('回撤为非负且不小于任一时点回撤', () => {
    const series = buildEquitySeries({
      seed: 'dd',
      baseCapital: 100_000,
      endTime: END_TIME,
    })

    expect(series.maxDrawdownPct).toBeGreaterThanOrEqual(0)
    for (const point of series.points) {
      expect(point.drawdownPct).toBeLessThanOrEqual(series.maxDrawdownPct + 1e-6)
    }
  })

  it('PnL 与最终权益、基准资金保持一致', () => {
    const series = buildEquitySeries({
      seed: 'pnl',
      baseCapital: 80_000,
      endTime: END_TIME,
    })

    expect(series.totalPnl).toBeCloseTo(series.finalEquity - series.baseCapital, 2)
    expect(series.totalPnlPct).toBeCloseTo(
      (series.totalPnl / series.baseCapital) * 100,
      2,
    )
  })

  it('对过小或非法的基准资金做下限保护', () => {
    const series = buildEquitySeries({ seed: 'z', baseCapital: 0, endTime: END_TIME })
    expect(series.baseCapital).toBe(1_000)
  })

  it('点数下限为 2', () => {
    const series = buildEquitySeries({
      seed: 'z',
      baseCapital: 10_000,
      points: 1,
      endTime: END_TIME,
    })
    expect(series.points).toHaveLength(2)
  })

  it('零波动零漂移时曲线保持水平', () => {
    const series = buildEquitySeries({
      seed: 'flat',
      baseCapital: 10_000,
      points: 5,
      volatility: 0,
      drift: 0,
      endTime: END_TIME,
    })

    expect(series.points.every((point) => point.equity === 10_000)).toBe(true)
    expect(series.maxDrawdownPct).toBe(0)
  })
})
