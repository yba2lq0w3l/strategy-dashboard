import type { Strategy, StrategyState } from '../types/strategy'
import { parseAmount } from './format'

/** 由真实策略列表聚合出的顶部总览指标，全部来自后端字段，无模拟成分。 */
export interface PortfolioMetrics {
  readonly total: number
  readonly activeCount: number
  readonly pausedCount: number
  readonly terminatedCount: number
  readonly totalAllocated: number
  readonly totalCapitalCapacity: number
  readonly totalStrategyCapacity: number
  /** 已分配资金 / 资金容量，反映容量使用率。 */
  readonly capacityUsagePct: number
  readonly avgLeverage: number
  readonly maxLeverage: number
  readonly liveCount: number
}

const EMPTY_METRICS: PortfolioMetrics = Object.freeze({
  total: 0,
  activeCount: 0,
  pausedCount: 0,
  terminatedCount: 0,
  totalAllocated: 0,
  totalCapitalCapacity: 0,
  totalStrategyCapacity: 0,
  capacityUsagePct: 0,
  avgLeverage: 0,
  maxLeverage: 0,
  liveCount: 0,
})

function countByState(
  strategies: readonly Strategy[],
  state: StrategyState,
): number {
  return strategies.filter((item) => item.state === state).length
}

export function computePortfolioMetrics(
  strategies: readonly Strategy[],
): PortfolioMetrics {
  if (strategies.length === 0) return EMPTY_METRICS

  const totalAllocated = sumBy(strategies, (s) => parseAmount(s.allocation))
  const totalCapitalCapacity = sumBy(strategies, (s) =>
    parseAmount(s.capitalCapacity),
  )
  const leverages = strategies.map((s) => parseAmount(s.maxLeverage))

  return {
    total: strategies.length,
    activeCount: countByState(strategies, 'active'),
    pausedCount: countByState(strategies, 'paused'),
    terminatedCount: countByState(strategies, 'terminated'),
    totalAllocated,
    totalCapitalCapacity,
    totalStrategyCapacity: sumBy(strategies, (s) =>
      parseAmount(s.strategyCapacity),
    ),
    capacityUsagePct:
      totalCapitalCapacity > 0
        ? (totalAllocated / totalCapitalCapacity) * 100
        : 0,
    avgLeverage: leverages.reduce((acc, v) => acc + v, 0) / leverages.length,
    maxLeverage: Math.max(...leverages),
    liveCount: strategies.filter((item) => item.runtimeEnv === 'live').length,
  }
}

function sumBy(
  strategies: readonly Strategy[],
  selector: (item: Strategy) => number,
): number {
  return strategies.reduce((acc, item) => acc + selector(item), 0)
}

/** 活跃占比，用于驱动遥测强度。 */
export function activeRatio(metrics: PortfolioMetrics): number {
  return metrics.total > 0 ? metrics.activeCount / metrics.total : 0
}
