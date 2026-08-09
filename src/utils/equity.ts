import type { EquityPoint, EquitySummary } from '../types/equity'

/**
 * 权益曲线汇总。
 *
 * 曲线数据来自后端 `/v1/agent/strategies/equity-history`，这里只做派生统计。
 * 刻意从曲线点本身推导而不是直接用策略的 total_pnl：图表头部的数字必须和画出来的
 * 线一致，而 total_pnl 是全周期口径、曲线是窗口口径，两者混用会自相矛盾。
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** 无数据点时返回 null，让 UI 渲染空态而不是把 0 当成真实读数。 */
export function summarizeEquity(
  points: readonly EquityPoint[],
): EquitySummary | null {
  if (points.length === 0) return null

  const baseEquity = points[0].equity
  const finalEquity = points[points.length - 1].equity
  const totalPnl = finalEquity - baseEquity

  // 优先采用后端逐点给出的回撤；缺失时才从净值序列自行推导。
  const maxDrawdownPct = points.reduce(
    (worst, point) => Math.max(worst, point.drawdownPct),
    0,
  )

  return {
    baseEquity: round2(baseEquity),
    finalEquity: round2(finalEquity),
    totalPnl: round2(totalPnl),
    totalPnlPct: baseEquity !== 0 ? round2((totalPnl / baseEquity) * 100) : 0,
    maxDrawdownPct: round2(maxDrawdownPct),
  }
}
