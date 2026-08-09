import { ChevronRight, Gauge, Wallet } from 'lucide-react'
import type { StrategyTemplate } from '../../types/template'
import { formatCompactCurrency, formatLeverage } from '../../utils/format'
import { RiskBadge } from '../badges/RiskBadge'

interface TemplateCardProps {
  readonly template: StrategyTemplate
  readonly selected: boolean
  readonly onSelect: (template: StrategyTemplate) => void
}

export function TemplateCard({
  template,
  selected,
  onSelect,
}: TemplateCardProps) {
  const requiredParams = template.params.filter((param) => param.required)

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      aria-pressed={selected}
      className={`panel corner-ticks group flex w-full flex-col gap-2.5 p-3.5 text-left transition-colors ${
        selected
          ? 'border-neon/50 panel-glow'
          : 'hover:border-flux/45'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{template.name}</h3>
        <RiskBadge level={template.riskLevel} />
      </div>

      <p className="line-clamp-3 text-[11px] leading-relaxed text-ink-faint">
        {template.description}
      </p>

      <dl className="mt-auto flex items-center gap-4 border-t border-hairline/70 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Gauge aria-hidden className="size-3 text-ink-faint" />
          <dt className="sr-only">推荐杠杆</dt>
          <dd className="numeric text-[11px] text-ink-dim">
            {formatLeverage(template.recommendedLeverage)}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Wallet aria-hidden className="size-3 text-ink-faint" />
          <dt className="sr-only">建议额度</dt>
          <dd className="numeric text-[11px] text-ink-dim">
            {formatCompactCurrency(template.defaultAllocation)}
          </dd>
        </div>
        {requiredParams.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <span className="numeric text-[10px] text-ink-faint">
              {requiredParams.length} 项参数
            </span>
            <ChevronRight
              aria-hidden
              className="size-3 text-ink-faint transition-transform group-hover:translate-x-0.5"
            />
          </div>
        )}
      </dl>
    </button>
  )
}
