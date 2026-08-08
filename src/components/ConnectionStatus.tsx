import type { ConnectionStatus as Status } from '../hooks/useStrategies'
import { formatRelativeTime } from '../utils/format'

interface ConnectionStatusProps {
  readonly status: Status
  readonly lastSyncAt: number | null
  readonly now: number
  readonly error: string | null
}

const STATUS_TEXT: Record<Status, string> = {
  connecting: 'CONNECTING…',
  online: 'ONLINE · STAGING CONNECTED',
  degraded: 'DEGRADED · SHOWING LAST SNAPSHOT',
  offline: 'OFFLINE · UPSTREAM UNREACHABLE',
}

const STATUS_COLOR: Record<Status, string> = {
  connecting: 'text-flux-soft',
  online: 'text-neon-soft',
  degraded: 'text-amber-300',
  offline: 'text-ask',
}

const DOT_COLOR: Record<Status, string> = {
  connecting: 'bg-flux-soft',
  online: 'bg-neon animate-pulse-ring',
  degraded: 'bg-amber-400',
  offline: 'bg-ask',
}

export function ConnectionStatus({
  status,
  lastSyncAt,
  now,
  error,
}: ConnectionStatusProps) {
  return (
    <div
      className="flex flex-col gap-0.5"
      role="status"
      aria-live="polite"
      title={error ?? undefined}
    >
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${DOT_COLOR[status]}`} aria-hidden />
        <span
          className={`font-mono text-[11px] font-semibold tracking-[0.14em] ${STATUS_COLOR[status]}`}
        >
          {STATUS_TEXT[status]}
        </span>
      </div>
      <span className="numeric pl-4 text-[10px] text-ink-faint">
        LAST SYNC · {formatRelativeTime(lastSyncAt, now)}
      </span>
    </div>
  )
}
