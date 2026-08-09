import { Hexagon, LayoutTemplate, Plus, RefreshCw } from 'lucide-react'
import { REFRESH_INTERVALS, type RefreshInterval } from '../config/env'
import type { ConnectionStatus as Status } from '../hooks/useStrategies'
import { ConnectionStatus } from './ConnectionStatus'
import { Button } from './ui/Button'

interface HeaderProps {
  readonly status: Status
  readonly lastSyncAt: number | null
  readonly now: number
  readonly error: string | null
  readonly interval: RefreshInterval
  readonly isRefreshing: boolean
  readonly onIntervalChange: (value: RefreshInterval) => void
  readonly onRefresh: () => void
  readonly onCreate: () => void
  readonly onLaunchTemplate: () => void
}

export function Header({
  status,
  lastSyncAt,
  now,
  error,
  interval,
  isRefreshing,
  onIntervalChange,
  onRefresh,
  onCreate,
  onLaunchTemplate,
}: HeaderProps) {
  return (
    <header className="panel corner-ticks flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="relative grid size-10 place-items-center rounded-lg border border-neon/35 bg-neon/10">
          <Hexagon aria-hidden className="size-5 text-neon-soft" />
          <span className="absolute inset-0 rounded-lg bg-neon/10 blur-md" aria-hidden />
        </div>
        <div>
          <h1 className="font-mono text-sm font-bold tracking-[0.2em] text-ink">
            STRATEGY<span className="text-neon-soft">·</span>MISSION CONTROL
          </h1>
          <p className="text-[11px] text-ink-faint">
            AI 策略沙箱实盘监控大屏 · agent-staging.agentos-app.app
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ConnectionStatus
          status={status}
          lastSyncAt={lastSyncAt}
          now={now}
          error={error}
        />

        <div
          className="flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.03] p-1"
          role="group"
          aria-label="自动刷新间隔"
        >
          <span className="label-caps px-1.5">AUTO</span>
          {REFRESH_INTERVALS.map((option) => {
            const selected = option.value === interval
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={selected}
                onClick={() => onIntervalChange(option.value)}
                className={`h-6 rounded px-2 font-mono text-[11px] transition-colors ${
                  selected
                    ? 'bg-neon/20 text-neon-soft shadow-[0_0_12px_-4px_rgba(16,185,129,0.8)]'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <Button
          onClick={onRefresh}
          loading={isRefreshing}
          icon={<RefreshCw aria-hidden className="size-3.5" />}
          aria-label="立即刷新"
        >
          REFRESH
        </Button>

        <Button
          onClick={onCreate}
          icon={<Plus aria-hidden className="size-3.5" />}
        >
          NEW STRATEGY
        </Button>

        <Button
          variant="primary"
          onClick={onLaunchTemplate}
          icon={<LayoutTemplate aria-hidden className="size-3.5" />}
        >
          FROM TEMPLATE
        </Button>
      </div>
    </header>
  )
}
