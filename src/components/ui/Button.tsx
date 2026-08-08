import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'warn' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly loading?: boolean
  readonly icon?: ReactNode
  readonly children?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-neon/15 text-neon-soft border-neon/40 hover:bg-neon/25 hover:border-neon/70 shadow-[0_0_18px_-6px_rgba(16,185,129,0.7)]',
  ghost:
    'bg-transparent text-ink-dim border-transparent hover:bg-white/5 hover:text-ink',
  outline:
    'bg-white/[0.03] text-ink-dim border-hairline hover:border-flux/60 hover:text-ink',
  warn: 'bg-amber-500/12 text-amber-300 border-amber-500/35 hover:bg-amber-500/22',
  danger: 'bg-ask/12 text-ask border-ask/35 hover:bg-ask/22',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[11px] gap-1.5',
  md: 'h-9 px-3.5 text-xs gap-2',
}

export function Button({
  variant = 'outline',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md border font-mono font-medium tracking-wide whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
