import { Activity, Gauge, TrendingDown, Wallet } from 'lucide-react'
import type { StrategyMetrics } from '../types/strategy'
import type { PortfolioMetrics } from '../utils/metrics'
import {
  formatCompactCurrency,
  formatPercent,
  formatSignedPercent,
} from '../utils/format'
import { MetricCard } from './MetricCard'

interface PerformanceOverviewProps {
  readonly metrics: PortfolioMetrics
  /** 后端返回的整体收益统计，未就绪时为 null。 */
  readonly summary: StrategyMetrics | null
}

const PLACEHOLDER = '—'

export function PerformanceOverview({
  metrics,
  summary,
}: PerformanceOverviewProps) {
  const hasPnl = summary !== null
  const pnlPositive = (summary?.totalPnl ?? 0) >= 0

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
        label="Total PnL"
        value={hasPnl ? formatCompactCurrency(summary.totalPnl) : PLACEHOLDER}
        icon={<Wallet aria-hidden className="size-4" />}
        tone={hasPnl && !pnlPositive ? 'ask' : 'neon'}
        hint={
          hasPnl
            ? `收益率 ${formatSignedPercent(summary.totalPnlPct)} · 已分配 ${formatCompactCurrency(metrics.totalAllocated)}`
            : '暂无收益数据 · 策略成交后自动更新'
        }
      />

      <MetricCard
        label="Win Rate"
        value={hasPnl ? summary.winRatePct.toFixed(1) : PLACEHOLDER}
        unit={hasPnl ? '%' : undefined}
        icon={<Gauge aria-hidden className="size-4" />}
        tone="neon"
        progress={hasPnl ? summary.winRatePct / 100 : undefined}
        hint={hasPnl ? '全部策略合并胜率' : '暂无成交记录'}
      />

      <MetricCard
        label="Max Drawdown"
        value={hasPnl ? summary.maxDrawdownPct.toFixed(2) : PLACEHOLDER}
        unit={hasPnl ? '%' : undefined}
        icon={<TrendingDown aria-hidden className="size-4" />}
        tone={hasPnl && summary.maxDrawdownPct > 0 ? 'amber' : 'flux'}
        progress={hasPnl ? summary.maxDrawdownPct / 100 : undefined}
        hint={
          hasPnl
            ? `容量使用率 ${formatPercent(metrics.capacityUsagePct)}`
            : '暂无回撤数据'
        }
      />
    </div>
  )
}
