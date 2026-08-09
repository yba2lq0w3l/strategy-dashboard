import { ShieldCheck, ShieldAlert, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RiskLevel } from '../../types/template'

interface RiskBadgeProps {
  readonly level: RiskLevel
}

interface RiskStyle {
  readonly label: string
  readonly className: string
  readonly icon: ReactNode
}

/** 风险等级同样是「颜色 + 图标 + 文字」三重编码，不依赖颜色单独表意。 */
const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  LOW: {
    label: '低风险',
    className: 'text-neon-soft border-neon/40 bg-neon/10',
    icon: <ShieldCheck aria-hidden className="size-3" />,
  },
  MEDIUM: {
    label: '中风险',
    className: 'text-amber-300 border-amber-400/40 bg-amber-400/10',
    icon: <ShieldAlert aria-hidden className="size-3" />,
  },
  HIGH: {
    label: '高风险',
    className: 'text-ask border-ask/40 bg-ask/10',
    icon: <Flame aria-hidden className="size-3" />,
  },
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const style = RISK_STYLES[level]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] ${style.className}`}
    >
      {style.icon}
      {style.label}
    </span>
  )
}
