import { useCallback, useState } from 'react'
import {
  appendLog,
  createLogEntry,
  type LogEntry,
  type LogLevel,
} from '../utils/telemetry'

export interface UseConsoleLogResult {
  readonly logs: readonly LogEntry[]
  push: (level: LogLevel, source: string, message: string) => void
  pushEntry: (entry: LogEntry) => void
  clear: () => void
}

/** 控制台日志流。始终以不可变方式追加，并由 appendLog 截断长度上限。 */
export function useConsoleLog(initial: readonly LogEntry[] = []): UseConsoleLogResult {
  const [logs, setLogs] = useState<readonly LogEntry[]>(initial)

  const pushEntry = useCallback((entry: LogEntry) => {
    setLogs((prev) => appendLog(prev, entry))
  }, [])

  const push = useCallback(
    (level: LogLevel, source: string, message: string) => {
      pushEntry(createLogEntry(level, source, message))
    },
    [pushEntry],
  )

  const clear = useCallback(() => setLogs([]), [])

  return { logs, push, pushEntry, clear }
}
