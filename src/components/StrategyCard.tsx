import { useState } from 'react'
import { Ban, Coins, Pause, Play, ShieldCheck } from 'lucide-react'
import type { Strategy, StrategyAction } from '../types/strategy'
import { canAllocate, canRunAction } from '../types/strategy'
import { formatRatioAsPercent } from '../utils/percent'
import {
  daysUntil,
  formatCurrency,
  formatDateTime,
  formatLeverage,
  formatPercent,
  parseAmount,
  truncateId,
} from '../utils/format'
import { RuntimeBadge } from './badges/RuntimeBadge'
import { StateBadge } from './badges/StateBadge'
import { Button } from './ui/Button'

interface StrategyCardProps {
  readonly strategy: Strategy
  readonly pending: boolean
  readonly onAction: (strategyId: string, action: StrategyAction) => void
  readonly onAllocate: (strategy: Strategy) => void
}

const EXPIRY_WARNING_DAYS = 3

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps">{label}</dt>
      <dd className="numeric mt-0.5 truncate text-xs text-ink">{value}</dd>
    </div>
  )
}

export function StrategyCard({
  strategy,
  pending,
  onAction,
  onAllocate,
}: StrategyCardProps) {
  const [confirmingTerminate, setConfirmingTerminate] = useState(false)

  const allocation = parseAmount(strategy.allocation)
  const capacity = parseAmount(strategy.capitalCapacity)
  const usagePct = capacity > 0 ? (allocation / capacity) * 100 : 0
  const remainingDays = daysUntil(strategy.expiresAt)
  const expiringSoon =
    remainingDays !== null && remainingDays <= EXPIRY_WARNING_DAYS

  const isTerminated = strategy.state === 'terminated'

  return (
    <article
      className={`panel corner-ticks flex flex-col gap-3 p-4 transition-colors ${
        isTerminated ? 'opacity-55' : 'hover:border-flux/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">
              {strategy.name}
            </h3>
            <RuntimeBadge env={strategy.runtimeEnv} />
          </div>
          <p
            className="numeric mt-1 truncate text-[10px] text-ink-faint"
            title={strategy.strategyId}
          >
            {truncateId(strategy.strategyId)} · v{strategy.version}
          </p>
        </div>
        <StateBadge state={strategy.state} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        <MetricRow label="Allocation" value={formatCurrency(strategy.allocation)} />
        <MetricRow
          label="Capital Cap"
          value={formatCurrency(strategy.capitalCapacity)}
        />
        <MetricRow
          label="Strategy Cap"
          value={formatCurrency(strategy.strategyCapacity)}
        />
        <MetricRow
          label="Max Leverage"
          value={formatLeverage(strategy.maxLeverage)}
        />
        <MetricRow label="Template" value={strategy.templateId ?? '—'} />
        <MetricRow label="Expires" value={formatDateTime(strategy.expiresAt)} />
        <MetricRow
          label="Take Profit"
          value={formatRatioAsPercent(strategy.takeProfitPct)}
        />
        <MetricRow
          label="Stop Loss"
          value={formatRatioAsPercent(strategy.stopLossPct)}
        />
      </dl>

      <div>
        <div className="flex items-center justify-between">
          <span className="label-caps">Capacity Usage</span>
          <span className="numeric text-[11px] text-ink-dim">
            {formatPercent(usagePct)}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              usagePct > 90 ? 'bg-ask' : usagePct > 70 ? 'bg-amber-400' : 'bg-neon'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }}
          />
        </div>
      </div>

      {expiringSoon && (
        <p className="flex items-center gap-1.5 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
          <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
          {remainingDays !== null && remainingDays >= 0
            ? `${remainingDays} 天后到期`
            : '已过期'}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-hairline/70 pt-3">
        <Button
          size="sm"
          variant="warn"
          icon={<Pause aria-hidden className="size-3" />}
          disabled={pending || !canRunAction(strategy.state, 'pause')}
          loading={pending}
          onClick={() => onAction(strategy.strategyId, 'pause')}
        >
          PAUSE
        </Button>

        <Button
          size="sm"
          variant="primary"
          icon={<Play aria-hidden className="size-3" />}
          disabled={pending || !canRunAction(strategy.state, 'resume')}
          onClick={() => onAction(strategy.strategyId, 'resume')}
        >
          RESUME
        </Button>

        <Button
          size="sm"
          variant="outline"
          icon={<Coins aria-hidden className="size-3" />}
          disabled={pending || !canAllocate(strategy.state)}
          title={
            canAllocate(strategy.state)
              ? undefined
              : '仅 ACTIVE 策略可调整额度'
          }
          onClick={() => onAllocate(strategy)}
        >
          ALLOCATE
        </Button>

        {confirmingTerminate ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-ask">确认终止?</span>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                setConfirmingTerminate(false)
                onAction(strategy.strategyId, 'terminate')
              }}
            >
              YES
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingTerminate(false)}
            >
              NO
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="danger"
            icon={<Ban aria-hidden className="size-3" />}
            disabled={pending || !canRunAction(strategy.state, 'terminate')}
            onClick={() => setConfirmingTerminate(true)}
          >
            TERMINATE
          </Button>
        )}
      </div>
    </article>
  )
}
