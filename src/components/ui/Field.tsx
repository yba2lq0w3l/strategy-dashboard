import type { ReactNode } from 'react'

interface FieldProps {
  readonly label: string
  readonly htmlFor: string
  readonly hint?: string
  readonly error?: string
  readonly children: ReactNode
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="label-caps">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-ask" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-ink-faint">{hint}</p>
      )}
    </div>
  )
}

/** 表单控件基础样式，输入框与下拉框共用。 */
export const CONTROL_CLASS =
  'h-9 w-full rounded-md border border-hairline bg-white/[0.03] px-3 font-mono text-xs text-ink placeholder:text-ink-faint transition-colors focus:border-neon/60 focus:outline-none disabled:opacity-50'

export const CONTROL_ERROR_CLASS = `${CONTROL_CLASS} border-ask/60`
