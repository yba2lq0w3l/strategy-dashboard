/**
 * 策略领域模型。
 *
 * 注意：上游返回的 `state` 是大写枚举（ACTIVE / PAUSED / TERMINATED / CREATED），
 * 与需求文档中的小写写法不一致。解析层统一归一化为小写字面量联合类型，
 * UI 层只面向这里定义的类型编程。
 */

export type StrategyState = 'created' | 'active' | 'paused' | 'terminated'

export type RuntimeEnv = 'live' | 'paper' | 'backtest'

/**
 * 策略收益统计。
 *
 * ⚠️ 单位口径：上游把两种单位混在同一个对象里——
 * `total_pnl_pct` 是百分比（3.66 表示 3.66%），
 * 而 `win_rate` / `max_drawdown` 是 0~1 比例（0.666 表示 66.6%）。
 * 解析层已统一归一化成百分比，UI 层拿到的全部是「百分比」口径。
 */
export interface StrategyMetrics {
  /** 累计收益金额。 */
  readonly totalPnl: number
  /** 累计收益率百分比，3.66 表示 3.66%。 */
  readonly totalPnlPct: number
  /** 胜率百分比，66.6 表示 66.6%（上游的 0.666 已 ×100）。 */
  readonly winRatePct: number
  /** 最大回撤百分比，12.5 表示 12.5%（上游的 0.125 已 ×100）。 */
  readonly maxDrawdownPct: number
}

export interface Strategy {
  readonly strategyId: string
  readonly userId: string | null
  readonly agentId: string | null
  readonly name: string
  readonly templateId: string | null
  readonly runtimeEnv: RuntimeEnv
  readonly allocation: string
  readonly capitalCapacity: string
  readonly strategyCapacity: string
  readonly maxLeverage: string
  readonly allowedAssets: readonly string[] | null
  readonly expiresAt: string | null
  /** 止盈比例，0~1 口径（"0.1" 表示 +10%）。未设置时为 null。 */
  readonly takeProfitPct: string | null
  /** 止损比例，0~1 口径（"0.05" 表示 -5%）。未设置时为 null。 */
  readonly stopLossPct: string | null
  readonly state: StrategyState
  readonly version: number
  /** 收益统计。上游把这些字段标为可选，缺失时为 null。 */
  readonly metrics: StrategyMetrics | null
}

export interface CreateStrategyInput {
  readonly name: string
  readonly templateId: string
  readonly runtimeEnv: RuntimeEnv
  readonly allocation: string
  readonly capitalCapacity: string
  readonly strategyCapacity: string
  readonly maxLeverage: string
  readonly allowedAssets?: readonly string[]
  readonly expiresAt?: string
  /** 止盈比例，0~1 口径字符串。留空表示不设。 */
  readonly takeProfitPct?: string
  /** 止损比例，0~1 口径字符串。留空表示不设。 */
  readonly stopLossPct?: string
}

export type StrategyAction = 'pause' | 'resume' | 'terminate'

export const RUNTIME_ENVS: readonly RuntimeEnv[] = ['paper', 'live', 'backtest']

export const STRATEGY_STATES: readonly StrategyState[] = [
  'created',
  'active',
  'paused',
  'terminated',
]

/** 状态机：仅 ACTIVE 可暂停，仅 PAUSED 可恢复，终止态不可再操作（上游会返回 409）。 */
export function canRunAction(
  state: StrategyState,
  action: StrategyAction,
): boolean {
  switch (action) {
    case 'pause':
      return state === 'active'
    case 'resume':
      return state === 'paused'
    case 'terminate':
      return state !== 'terminated'
    default:
      return false
  }
}

/**
 * 调整额度不属于 StrategyAction（它带额外入参），单独约束。
 * 上游要求策略处于 ACTIVE：PAUSED 时调用会返回
 * 409「仅 ACTIVE 策略可调整额度」。
 */
export function canAllocate(state: StrategyState): boolean {
  return state === 'active'
}
