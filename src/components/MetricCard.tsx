import type { ReactNode } from 'react'

type MetricTone = 'neon' | 'flux' | 'amber' | 'ask'

interface MetricCardProps {
  readonly label: string
  readonly value: string
  readonly unit?: string
  readonly hint?: ReactNode
  readonly icon: ReactNode
  readonly tone?: MetricTone
  /** 0~1，绘制底部进度条。 */
  readonly progress?: number
}

const TONE_TEXT: Record<MetricTone, string> = {
  neon: 'text-neon-soft',
  flux: 'text-flux-soft',
  amber: 'text-amber-300',
  ask: 'text-ask',
}

const TONE_BAR: Record<MetricTone, string> = {
  neon: 'bg-neon',
  flux: 'bg-flux',
  amber: 'bg-amber-400',
  ask: 'bg-ask',
}

const TONE_RING: Record<MetricTone, string> = {
  neon: 'border-neon/30 bg-neon/10',
  flux: 'border-flux/30 bg-flux/10',
  amber: 'border-amber-400/30 bg-amber-400/10',
  ask: 'border-ask/30 bg-ask/10',
}

/**
 * 单一数值的 stat tile：数字是主角，标签与辅助信息保持 ink 色阶，
 * 颜色只落在图标与进度条上，避免文字被着色喧宾夺主。
 */
export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'neon',
  progress,
}: MetricCardProps) {
  const clamped =
    typeof progress === 'number' ? Math.min(1, Math.max(0, progress)) : null

  return (
    <article className="panel corner-ticks px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="label-caps">{label}</span>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg border ${TONE_RING[tone]} ${TONE_TEXT[tone]}`}
        >
          {icon}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="numeric text-[28px] leading-none font-semibold text-ink">
          {value}
        </span>
        {unit && <span className="numeric text-sm text-ink-faint">{unit}</span>}
      </div>

      {hint && (
        <p className="mt-1.5 truncate text-[11px] text-ink-faint">{hint}</p>
      )}

      {clamped !== null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${TONE_BAR[tone]} transition-[width] duration-500`}
            style={{ width: `${clamped * 100}%` }}
          />
        </div>
      )}
    </article>
  )
}
