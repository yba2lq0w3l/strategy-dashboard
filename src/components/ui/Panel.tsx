import type { ReactNode } from 'react'

interface PanelProps {
  readonly title?: string
  readonly subtitle?: string
  readonly icon?: ReactNode
  readonly actions?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly bodyClassName?: string
  readonly glow?: boolean
}

/** 大屏统一容器：标题栏 + 内容区，带角标刻线与可选霓虹辉光。 */
export function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
  glow = false,
}: PanelProps) {
  return (
    <section
      className={`panel corner-ticks flex flex-col ${glow ? 'panel-glow' : ''} ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-hairline/80 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="text-neon-soft shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate font-mono text-xs font-semibold tracking-[0.16em] text-ink uppercase">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="truncate text-[11px] text-ink-faint">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
