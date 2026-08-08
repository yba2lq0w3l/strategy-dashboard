import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { Toast, ToastTone } from '../hooks/useToasts'
import type { ReactNode } from 'react'

interface ToastStackProps {
  readonly toasts: readonly Toast[]
  readonly onDismiss: (id: number) => void
}

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 aria-hidden className="size-4 text-neon-soft" />,
  error: <XCircle aria-hidden className="size-4 text-ask" />,
  warn: <AlertTriangle aria-hidden className="size-4 text-amber-300" />,
  info: <Info aria-hidden className="size-4 text-flux-soft" />,
}

const TONE_BORDER: Record<ToastTone, string> = {
  success: 'border-neon/40',
  error: 'border-ask/40',
  warn: 'border-amber-400/40',
  info: 'border-flux/40',
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`panel pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 ${TONE_BORDER[toast.tone]}`}
        >
          <span className="mt-0.5 shrink-0">{TONE_ICON[toast.tone]}</span>
          <p className="min-w-0 flex-1 text-[11px] break-words text-ink-dim">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="关闭提示"
            className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
