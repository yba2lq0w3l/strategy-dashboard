import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine } from 'lucide-react'
import type { LogEntry, LogLevel } from '../../utils/telemetry'
import { formatClock } from '../../utils/format'

interface LogConsoleProps {
  readonly logs: readonly LogEntry[]
}

const LEVEL_STYLE: Record<LogLevel, { text: string; tag: string }> = {
  info: { text: 'text-ink-dim', tag: 'INFO' },
  success: { text: 'text-neon-soft', tag: 'OK  ' },
  warn: { text: 'text-amber-300', tag: 'WARN' },
  error: { text: 'text-ask', tag: 'ERR ' },
  signal: { text: 'text-flux-soft', tag: 'SIG ' },
}

/** 终端风格实时日志。用户手动上滚时暂停自动跟随，避免读日志被打断。 */
export function LogConsole({ logs }: LogConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    if (!following) return
    containerRef.current?.scrollTo({ top: 0 })
  }, [logs, following])

  const handleScroll = () => {
    const element = containerRef.current
    if (!element) return
    setFollowing(element.scrollTop <= 8)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        role="log"
        aria-live="polite"
        aria-label="实时运行日志"
      >
        {logs.length === 0 ? (
          <p className="numeric px-1 py-6 text-center text-[11px] text-ink-faint">
            等待信号流接入…
          </p>
        ) : (
          <ul className="space-y-0.5">
            {logs.map((entry) => {
              const style = LEVEL_STYLE[entry.level]
              return (
                <li
                  key={entry.id}
                  className="numeric flex gap-2 rounded px-1 py-[3px] text-[11px] leading-relaxed hover:bg-white/[0.04]"
                >
                  <span className="shrink-0 text-ink-faint">
                    {formatClock(entry.timestamp)}
                  </span>
                  <span className={`shrink-0 font-semibold ${style.text}`}>
                    {style.tag}
                  </span>
                  <span className="shrink-0 text-flux-soft/70">
                    [{entry.source}]
                  </span>
                  <span className="min-w-0 break-words text-ink-dim">
                    {entry.message}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!following && (
        <button
          type="button"
          onClick={() => {
            setFollowing(true)
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-flux/40 bg-flux/20 px-2.5 py-1 font-mono text-[10px] text-flux-soft backdrop-blur"
        >
          <ArrowDownToLine aria-hidden className="size-3 rotate-180" />
          回到最新
        </button>
      )}
    </div>
  )
}
