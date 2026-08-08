import { Activity, Gauge, ShieldAlert, Wallet } from 'lucide-react'
import { RISK_LIMITS } from '../config/env'
import type { PortfolioMetrics } from '../utils/metrics'
import { formatCompactCurrency, formatPercent } from '../utils/format'
import { MetricCard } from './MetricCard'

interface PerformanceOverviewProps {
  readonly metrics: PortfolioMetrics
  /** 来自权益曲线的当前最大回撤（模拟）。 */
  readonly currentDrawdownPct: number
}

export function PerformanceOverview({
  metrics,
  currentDrawdownPct,
}: PerformanceOverviewProps) {
  const drawdownUsage = currentDrawdownPct / RISK_LIMITS.maxDrawdownPct
  const breached = currentDrawdownPct >= RISK_LIMITS.maxDrawdownPct

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Active Strategies"
        value={String(metrics.activeCount)}
        unit={`/ ${metrics.total}`}
        icon={<Activity aria-hidden className="size-4" />}
        tone="neon"
        progress={metrics.total > 0 ? metrics.activeCount / metrics.total : 0}
        hint={`${metrics.pausedCount} 暂停 · ${metrics.terminatedCount} 终止 · ${metrics.liveCount} live`}
      />

      <MetricCard
        label="Total Allocated Capital"
        value={formatCompactCurrency(metrics.totalAllocated)}
        icon={<Wallet aria-hidden className="size-4" />}
        tone="flux"
        progress={metrics.capacityUsagePct / 100}
        hint={`容量使用率 ${formatPercent(metrics.capacityUsagePct)} · 上限 ${formatCompactCurrency(metrics.totalCapitalCapacity)}`}
      />

      <MetricCard
        label="Estimated Win Rate"
        value={RISK_LIMITS.estimatedWinRatePct.toFixed(1)}
        unit="%"
        icon={<Gauge aria-hidden className="size-4" />}
        tone="neon"
        simulated
        progress={RISK_LIMITS.estimatedWinRatePct / 100}
        hint="模型胜率预测 · 后端暂未提供回测统计接口"
      />

      <MetricCard
        label="Max Drawdown Limit"
        value={RISK_LIMITS.maxDrawdownPct.toFixed(1)}
        unit="%"
        icon={<ShieldAlert aria-hidden className="size-4" />}
        tone={breached ? 'ask' : 'amber'}
        simulated
        progress={drawdownUsage}
        hint={`当前回撤 ${formatPercent(currentDrawdownPct, 2)} · 已用额度 ${formatPercent(drawdownUsage * 100)}`}
      />
    </div>
  )
}
