import { describe, expect, it } from 'vitest'
import { summarizeEquity } from './equity'
import type { EquityPoint } from '../types/equity'

function point(
  timestamp: number,
  equity: number,
  pnl: number,
  drawdownPct = 0,
): EquityPoint {
  return { timestamp, equity, pnl, drawdownPct }
}

describe('summarizeEquity', () => {
  it('无数据点时返回 null，让 UI 走空态而不是显示 0', () => {
    expect(summarizeEquity([])).toBeNull()
  })

  it('从首末点派生基准、终值与收益', () => {
    const summary = summarizeEquity([
      point(1_000, 10_000, 0),
      point(2_000, 10_500, 500),
      point(3_000, 10_800, 800),
    ])

    expect(summary).not.toBeNull()
    expect(summary?.baseEquity).toBe(10_000)
    expect(summary?.finalEquity).toBe(10_800)
    expect(summary?.totalPnl).toBe(800)
    expect(summary?.totalPnlPct).toBe(8)
  })

  it('亏损时收益与收益率均为负', () => {
    const summary = summarizeEquity([
      point(1_000, 10_000, 0),
      point(2_000, 9_500, -500),
    ])

    expect(summary?.totalPnl).toBe(-500)
    expect(summary?.totalPnlPct).toBe(-5)
  })

  it('取逐点回撤的最大值', () => {
    const summary = summarizeEquity([
      point(1_000, 10_000, 0, 0),
      point(2_000, 9_000, -1_000, 10),
      point(3_000, 9_500, -500, 5),
    ])

    expect(summary?.maxDrawdownPct).toBe(10)
  })

  it('单点曲线不产生除零或 NaN', () => {
    const summary = summarizeEquity([point(1_000, 10_000, 0)])

    expect(summary?.totalPnl).toBe(0)
    expect(summary?.totalPnlPct).toBe(0)
  })

  it('基准为 0 时收益率退化为 0 而不是 Infinity', () => {
    const summary = summarizeEquity([point(1_000, 0, 0), point(2_000, 500, 500)])

    expect(Number.isFinite(summary?.totalPnlPct ?? Number.NaN)).toBe(true)
    expect(summary?.totalPnlPct).toBe(0)
  })

  it('金额四舍五入到 2 位小数', () => {
    const summary = summarizeEquity([
      point(1_000, 10_000.123, 0),
      point(2_000, 10_123.456, 123.333),
    ])

    expect(summary?.baseEquity).toBe(10_000.12)
    expect(summary?.finalEquity).toBe(10_123.46)
    expect(summary?.totalPnl).toBe(123.33)
  })
})
