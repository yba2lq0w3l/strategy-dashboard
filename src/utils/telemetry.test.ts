import { describe, expect, it } from 'vitest'
import {
  appendLog,
  buildTelemetry,
  createLogEntry,
  synthesizeSignalLog,
} from './telemetry'
import { makeStrategy } from '../test/fixtures'

describe('buildTelemetry', () => {
  it('所有读数落在有效区间内', () => {
    for (let tick = 0; tick < 120; tick += 1) {
      const snapshot = buildTelemetry('seed', tick, 0.8)

      expect(snapshot.bidPressure).toBeGreaterThan(0)
      expect(snapshot.bidPressure).toBeLessThan(1)
      expect(snapshot.bidPressure + snapshot.askPressure).toBeCloseTo(1, 6)
      expect(snapshot.conviction).toBeGreaterThanOrEqual(5)
      expect(snapshot.conviction).toBeLessThanOrEqual(99)
      expect(snapshot.edge).toBeGreaterThanOrEqual(1)
      expect(snapshot.edge).toBeLessThanOrEqual(99)
      expect(snapshot.imbalance).toBeGreaterThan(0)
      expect(snapshot.latencyMs).toBeGreaterThanOrEqual(4)
      expect(snapshot.signalsPerMin).toBeGreaterThanOrEqual(0)
    }
  })

  it('同 seed 同 tick 完全一致', () => {
    expect(buildTelemetry('s', 5, 0.5)).toEqual(buildTelemetry('s', 5, 0.5))
  })

  it('活跃占比越高，信号频率越高', () => {
    const idle = buildTelemetry('s', 1, 0)
    const busy = buildTelemetry('s', 1, 1)
    expect(busy.signalsPerMin).toBeGreaterThan(idle.signalsPerMin)
  })
})

describe('synthesizeSignalLog', () => {
  const telemetry = buildTelemetry('s', 1, 0.5)

  it('无活跃策略时输出待机信息', () => {
    const entry = synthesizeSignalLog('s', 1, [], telemetry, 1_000)
    expect(entry.level).toBe('info')
    expect(entry.source).toBe('ENGINE')
  })

  it('有活跃策略时输出信号并填充占位符', () => {
    const entry = synthesizeSignalLog(
      's',
      3,
      [makeStrategy({ name: 'Alpha Momentum' })],
      telemetry,
      1_000,
    )

    expect(entry.level).toBe('signal')
    expect(entry.source).toBe('ALPHA MOMENTUM')
    expect(entry.message).not.toContain('{')
  })

  it('忽略非 active 状态的策略', () => {
    const entry = synthesizeSignalLog(
      's',
      3,
      [makeStrategy({ state: 'terminated' })],
      telemetry,
      1_000,
    )
    expect(entry.source).toBe('ENGINE')
  })
})

describe('appendLog', () => {
  it('新条目排在最前且不修改原数组', () => {
    const original = [createLogEntry('info', 'A', '第一条')]
    const next = appendLog(original, createLogEntry('warn', 'B', '第二条'))

    expect(next[0].message).toBe('第二条')
    expect(original).toHaveLength(1)
  })

  it('截断到长度上限', () => {
    let logs = [] as ReturnType<typeof appendLog>
    for (let i = 0; i < 200; i += 1) {
      logs = appendLog(logs, createLogEntry('info', 'X', `msg-${i}`))
    }

    expect(logs).toHaveLength(120)
    expect(logs[0].message).toBe('msg-199')
  })
})

describe('createLogEntry', () => {
  it('生成唯一 id', () => {
    const a = createLogEntry('info', 'S', 'x', 1)
    const b = createLogEntry('info', 'S', 'x', 1)
    expect(a.id).not.toBe(b.id)
  })
})
