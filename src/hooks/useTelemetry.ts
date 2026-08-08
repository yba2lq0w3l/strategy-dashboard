import { useEffect, useMemo, useRef, useState } from 'react'
import type { Strategy } from '../types/strategy'
import {
  buildTelemetry,
  synthesizeSignalLog,
  type LogEntry,
  type TelemetrySnapshot,
} from '../utils/telemetry'
import { useInterval } from './useInterval'

const TELEMETRY_TICK_MS = 1_800

export interface UseTelemetryOptions {
  readonly seed: string
  readonly strategies: readonly Strategy[]
  readonly activeRatio: number
  readonly enabled?: boolean
  readonly onSignal?: (entry: LogEntry) => void
}

/**
 * 遥测面板数据源（模拟）。以固定 tick 推进随机游走，
 * 并在每个 tick 向控制台注入一条信号日志。
 */
export function useTelemetry(options: UseTelemetryOptions): TelemetrySnapshot {
  const { seed, strategies, activeRatio, enabled = true, onSignal } = options
  const [tick, setTick] = useState(0)

  const signalRef = useRef(onSignal)
  useEffect(() => {
    signalRef.current = onSignal
  }, [onSignal])

  useInterval(() => setTick((prev) => prev + 1), enabled ? TELEMETRY_TICK_MS : 0)

  const telemetry = useMemo(
    () => buildTelemetry(seed, tick, activeRatio),
    [seed, tick, activeRatio],
  )

  const strategiesRef = useRef(strategies)
  useEffect(() => {
    strategiesRef.current = strategies
  }, [strategies])

  useEffect(() => {
    if (tick === 0) return
    signalRef.current?.(
      synthesizeSignalLog(
        seed,
        tick,
        strategiesRef.current,
        telemetry,
        Date.now(),
      ),
    )
  }, [seed, telemetry, tick])

  return telemetry
}
