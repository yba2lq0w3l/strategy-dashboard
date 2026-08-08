interface FactorMeterProps {
  readonly label: string
  readonly value: number
  readonly display: string
  /** 归一化后的填充比例 0~1。 */
  readonly ratio: number
  readonly tone?: 'neon' | 'flux'
}

const TONE_BAR = {
  neon: 'bg-neon',
  flux: 'bg-flux',
} as const

const TONE_TEXT = {
  neon: 'text-neon-soft',
  flux: 'text-flux-soft',
} as const

/** 单因子读数条：数值直标，条本身只做量级示意。 */
export function FactorMeter({
  label,
  value,
  display,
  ratio,
  tone = 'neon',
}: FactorMeterProps) {
  const clamped = Math.min(1, Math.max(0, ratio))

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-caps">{label}</span>
        <span className={`numeric text-sm font-semibold ${TONE_TEXT[tone]}`}>
          {display}
        </span>
      </div>
      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${TONE_BAR[tone]} transition-[width] duration-700 ease-out`}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  )
}
