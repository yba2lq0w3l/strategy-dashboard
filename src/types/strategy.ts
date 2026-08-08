/**
 * 策略领域模型。
 *
 * 注意：上游返回的 `state` 是大写枚举（ACTIVE / PAUSED / TERMINATED / CREATED），
 * 与需求文档中的小写写法不一致。解析层统一归一化为小写字面量联合类型，
 * UI 层只面向这里定义的类型编程。
 */

export type StrategyState = 'created' | 'active' | 'paused' | 'terminated'

export type RuntimeEnv = 'live' | 'paper' | 'backtest'

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
  readonly state: StrategyState
  readonly version: number
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
