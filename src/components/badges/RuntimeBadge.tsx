import type { RuntimeEnv } from '../../types/strategy'

interface RuntimeBadgeProps {
  readonly env: RuntimeEnv
}

const RUNTIME_STYLES: Record<RuntimeEnv, string> = {
  live: 'text-ask border-ask/45 bg-ask/10',
  paper: 'text-flux-soft border-flux/45 bg-flux/10',
  backtest: 'text-ink-dim border-hairline bg-white/[0.04]',
}

/** 运行环境标识。live 用高危色提醒这是真实资金环境。 */
export function RuntimeBadge({ env }: RuntimeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase ${RUNTIME_STYLES[env]}`}
    >
      {env}
    </span>
  )
}
