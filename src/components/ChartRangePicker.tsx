import { CHART_RANGES } from '../config/chartRanges'
import type { EquityRange } from '../types/equity'

interface ChartRangePickerProps {
  readonly value: EquityRange
  readonly onChange: (range: EquityRange) => void
}

/** 时间范围过滤器，按交互规范放在图表上方一行内。 */
export function ChartRangePicker({ value, onChange }: ChartRangePickerProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.03] p-1"
      role="group"
      aria-label="图表时间范围"
    >
      {CHART_RANGES.map((range) => {
        const selected = range.value === value
        return (
          <button
            key={range.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(range.value)}
            className={`h-6 rounded px-2 font-mono text-[10px] tracking-wider transition-colors ${
              selected
                ? 'bg-neon/20 text-neon-soft'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
