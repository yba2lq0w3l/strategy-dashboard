import type { Strategy } from '../types/strategy'
import { createRandom, gaussian, hashSeed, pick } from './random'

/**
 * 神经信号流合成。
 *
 * ⚠️ 同样是**模拟遥测**：后端未提供订单簿 / 因子接口。
 * 中心值取自需求给定的基准（Conviction 72%、Edge 72、Imbalance 0.93x），
 * 围绕基准做有界随机游走，并按真实活跃策略占比放大或收敛波动。
 */

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'signal'

export interface LogEntry {
  readonly id: string
  readonly timestamp: number
  readonly level: LogLevel
  readonly source: string
  readonly message: string
}

export interface TelemetrySnapshot {
  /** 买盘压力占比，0~1，与 askPressure 互补。 */
  readonly bidPressure: number
  readonly askPressure: number
  /** 信心度，0~100。 */
  readonly conviction: number
  /** Edge 得分，0~100。 */
  readonly edge: number
  /** 买卖失衡倍数。 */
  readonly imbalance: number
  readonly latencyMs: number
  readonly signalsPerMin: number
}

const CONVICTION_CENTER = 72
const EDGE_CENTER = 72
const IMBALANCE_CENTER = 0.93
const BID_CENTER = 0.54

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function buildTelemetry(
  seed: string,
  tick: number,
  activeRatio: number,
): TelemetrySnapshot {
  const random = createRandom(hashSeed(`${seed}:${tick}`))
  // 活跃策略越多，信号越强、抖动越大。
  const energy = 0.4 + clamp(activeRatio, 0, 1) * 0.9

  const bidPressure = clamp(
    BID_CENTER + gaussian(random) * 0.06 * energy,
    0.08,
    0.92,
  )

  return {
    bidPressure: round(bidPressure, 4),
    askPressure: round(1 - bidPressure, 4),
    conviction: round(
      clamp(CONVICTION_CENTER + gaussian(random) * 6 * energy, 5, 99),
      1,
    ),
    edge: round(clamp(EDGE_CENTER + gaussian(random) * 7 * energy, 1, 99), 0),
    imbalance: round(
      clamp(IMBALANCE_CENTER + gaussian(random) * 0.12 * energy, 0.05, 3),
      2,
    ),
    latencyMs: Math.round(clamp(18 + gaussian(random) * 6, 4, 120)),
    signalsPerMin: Math.round(clamp(120 * energy + gaussian(random) * 15, 0, 400)),
  }
}

const SIGNAL_TEMPLATES = [
  'orderbook imbalance {imbalance}x → 触发做市偏移',
  'conviction {conviction}% 越过阈值，扩大持仓窗口',
  'edge={edge} 微观结构评分刷新',
  '波动率簇检测：短周期 sigma 上移',
  '跨所价差收敛，撤回 2 档挂单',
  '滑点预算充足，路由至深度池',
  '风控哨兵：杠杆使用率处于安全区',
  '因子权重再平衡完成',
] as const

const IDLE_TEMPLATES = [
  '无活跃策略，信号引擎处于待机',
  '心跳正常，等待策略激活',
] as const

export function synthesizeSignalLog(
  seed: string,
  tick: number,
  strategies: readonly Strategy[],
  telemetry: TelemetrySnapshot,
  timestamp: number,
): LogEntry {
  const random = createRandom(hashSeed(`${seed}:log:${tick}`))
  const active = strategies.filter((item) => item.state === 'active')

  if (active.length === 0) {
    return {
      id: `sig-${tick}-${timestamp}`,
      timestamp,
      level: 'info',
      source: 'ENGINE',
      message: pick(random, IDLE_TEMPLATES),
    }
  }

  const target = pick(random, active)
  const message = pick(random, SIGNAL_TEMPLATES)
    .replace('{imbalance}', telemetry.imbalance.toFixed(2))
    .replace('{conviction}', telemetry.conviction.toFixed(0))
    .replace('{edge}', telemetry.edge.toFixed(0))

  return {
    id: `sig-${tick}-${timestamp}`,
    timestamp,
    level: 'signal',
    source: target.name.slice(0, 18).toUpperCase(),
    message,
  }
}

let logCounter = 0

export function createLogEntry(
  level: LogLevel,
  source: string,
  message: string,
  timestamp: number = Date.now(),
): LogEntry {
  logCounter += 1
  return { id: `log-${logCounter}-${timestamp}`, timestamp, level, source, message }
}

const MAX_LOG_ENTRIES = 120

/** 不可变追加：返回新数组并截断到上限，防止长时间运行内存增长。 */
export function appendLog(
  logs: readonly LogEntry[],
  entry: LogEntry,
): readonly LogEntry[] {
  return [entry, ...logs].slice(0, MAX_LOG_ENTRIES)
}
