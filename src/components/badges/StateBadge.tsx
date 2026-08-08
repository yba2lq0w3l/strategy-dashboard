import { CircleDot, CirclePause, CircleSlash, CircleDashed } from 'lucide-react'
import type { StrategyState } from '../../types/strategy'
import type { ReactNode } from 'react'

interface StateBadgeProps {
  readonly state: StrategyState
  readonly compact?: boolean
}

interface StateStyle {
  readonly label: string
  readonly className: string
  readonly icon: ReactNode
}

/** 状态色属于保留的 status 色板，始终与图标 + 文本同时出现，不单靠颜色表意。 */
const STATE_STYLES: Record<StrategyState, StateStyle> = {
  active: {
    label: 'ACTIVE',
    className: 'text-neon-soft border-neon/40 bg-neon/12',
    icon: <CircleDot aria-hidden className="size-3" />,
  },
  paused: {
    label: 'PAUSED',
    className: 'text-amber-300 border-amber-400/40 bg-amber-400/12',
    icon: <CirclePause aria-hidden className="size-3" />,
  },
  terminated: {
    label: 'TERMINATED',
    className: 'text-ask border-ask/40 bg-ask/12',
    icon: <CircleSlash aria-hidden className="size-3" />,
  },
  created: {
    label: 'CREATED',
    className: 'text-flux-soft border-flux/40 bg-flux/12',
    icon: <CircleDashed aria-hidden className="size-3" />,
  },
}

export function StateBadge({ state, compact = false }: StateBadgeProps) {
  const style = STATE_STYLES[state]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] ${style.className}`}
    >
      <span className={state === 'active' ? 'animate-pulse' : ''}>{style.icon}</span>
      {compact ? style.label.slice(0, 4) : style.label}
    </span>
  )
}
