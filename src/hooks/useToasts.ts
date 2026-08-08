import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'warn' | 'info'

export interface Toast {
  readonly id: number
  readonly tone: ToastTone
  readonly message: string
}

const TOAST_TTL_MS = 4_500
const MAX_TOASTS = 4

export interface UseToastsResult {
  readonly toasts: readonly Toast[]
  notify: (tone: ToastTone, message: string) => void
  dismiss: (id: number) => void
}

export function useToasts(): UseToastsResult {
  const [toasts, setToasts] = useState<readonly Toast[]>([])
  const nextIdRef = useRef(1)
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextIdRef.current
      nextIdRef.current += 1
      setToasts((prev) => [{ id, tone, message }, ...prev].slice(0, MAX_TOASTS))
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_TTL_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  return { toasts, notify, dismiss }
}
