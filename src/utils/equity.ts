import { createRandom, gaussian, hashSeed } from './random'

/**
 * 权益曲线合成。
 *
 * ⚠️ 该曲线为**模拟数据**：上游 `/v1/agent/strategies` 系列接口不提供
 * PnL / 净值时间序列。曲线的初始资金、波动率与漂移都由真实的策略
 * 分配额度、杠杆与活跃数量推导，因此会随真实策略变化而变化，
 * 但单点收益本身不代表真实成交结果。
 */

export interface EquityPoint {
  readonly timestamp: number
  readonly equity: number
  readonly pnl: number
  readonly drawdownPct: number
}

export interface EquitySeries {
  readonly points: readonly EquityPoint[]
  readonly baseCapital: number
  readonly finalEquity: number
  readonly totalPnl: number
  readonly totalPnlPct: number
  readonly maxDrawdownPct: number
}

export interface EquitySeriesParams {
  readonly seed: string
  readonly baseCapital: number
  readonly points?: number
  readonly intervalMs?: number
  readonly endTime: number
  /** 每步波动率（相对基准资金的比例）。 */
  readonly volatility?: number
  /** 每步漂移，正值代表策略整体处于盈利倾向。 */
  readonly drift?: number
}

const DEFAULT_POINTS = 72
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_VOLATILITY = 0.0045
const DEFAULT_DRIFT = 0.0011
const MIN_BASE_CAPITAL = 1_000

export function buildEquitySeries(params: EquitySeriesParams): EquitySeries {
  const {
    seed,
    endTime,
    points = DEFAULT_POINTS,
    intervalMs = DEFAULT_INTERVAL_MS,
    volatility = DEFAULT_VOLATILITY,
    drift = DEFAULT_DRIFT,
  } = params

  const baseCapital = Math.max(params.baseCapital, MIN_BASE_CAPITAL)
  const totalPoints = Math.max(2, Math.floor(points))
  const random = createRandom(hashSeed(seed))

  const series: EquityPoint[] = []
  let equity = baseCapital
  let peak = baseCapital
  let maxDrawdownPct = 0

  for (let i = 0; i < totalPoints; i += 1) {
    if (i > 0) {
      const shock = gaussian(random) * volatility
      equity = equity * (1 + drift + shock)
    }

    peak = Math.max(peak, equity)
    const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct)

    series.push({
      timestamp: endTime - (totalPoints - 1 - i) * intervalMs,
      equity: round2(equity),
      pnl: round2(equity - baseCapital),
      drawdownPct: round2(drawdownPct),
    })
  }

  const finalEquity = series[series.length - 1].equity
  const totalPnl = round2(finalEquity - baseCapital)

  return {
    points: series,
    baseCapital,
    finalEquity,
    totalPnl,
    totalPnlPct: round2((totalPnl / baseCapital) * 100),
    maxDrawdownPct: round2(maxDrawdownPct),
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
