import type { CreateStrategyInput, Strategy } from '../types/strategy'
import type { EquityRange, EquitySeries } from '../types/equity'
import { request } from './httpClient'
import {
  parseEquityHistory,
  parseStrategy,
  parseStrategyList,
  type StrategyListResult,
} from './schemas'

const STRATEGIES_PATH = '/v1/agent/strategies'
const EQUITY_HISTORY_PATH = `${STRATEGIES_PATH}/equity-history`

function toCreatePayload(input: CreateStrategyInput): Record<string, unknown> {
  return {
    name: input.name,
    template_id: input.templateId,
    runtime_env: input.runtimeEnv,
    allocation: input.allocation,
    capital_capacity: input.capitalCapacity,
    strategy_capacity: input.strategyCapacity,
    max_leverage: input.maxLeverage,
    ...(input.allowedAssets && input.allowedAssets.length > 0
      ? { allowed_assets: [...input.allowedAssets] }
      : {}),
    ...(input.expiresAt ? { expires_at: input.expiresAt } : {}),
  }
}

export interface StrategyRepository {
  list(signal?: AbortSignal): Promise<StrategyListResult>
  findById(strategyId: string, signal?: AbortSignal): Promise<Strategy>
  create(input: CreateStrategyInput): Promise<Strategy>
  pause(strategyId: string): Promise<Strategy>
  resume(strategyId: string): Promise<Strategy>
  terminate(strategyId: string): Promise<Strategy>
  allocate(strategyId: string, allocation: string): Promise<Strategy>
  equityHistory(
    range: EquityRange,
    strategyId?: string,
    signal?: AbortSignal,
  ): Promise<EquitySeries>
}

export const strategyApi: StrategyRepository = {
  async list(signal) {
    const payload = await request(STRATEGIES_PATH, { signal })
    return parseStrategyList(payload)
  },

  async findById(strategyId, signal) {
    const payload = await request(
      `${STRATEGIES_PATH}/${encodeURIComponent(strategyId)}`,
      { signal },
    )
    return parseStrategy(payload)
  },

  async create(input) {
    const payload = await request(STRATEGIES_PATH, {
      method: 'POST',
      body: toCreatePayload(input),
    })
    return parseStrategy(payload)
  },

  async pause(strategyId) {
    return runCommand(strategyId, 'pause')
  },

  async resume(strategyId) {
    return runCommand(strategyId, 'resume')
  },

  async terminate(strategyId) {
    return runCommand(strategyId, 'terminate')
  },

  async allocate(strategyId, allocation) {
    const payload = await request(
      `${STRATEGIES_PATH}/${encodeURIComponent(strategyId)}/allocate`,
      { method: 'POST', body: { allocation } },
    )
    return parseStrategy(payload)
  },

  async equityHistory(range, strategyId, signal) {
    const params = new URLSearchParams({ range })
    // 不传 strategy_id 时上游返回该 Agent 的合并曲线。
    if (strategyId) params.set('strategy_id', strategyId)

    const payload = await request(`${EQUITY_HISTORY_PATH}?${params}`, { signal })
    return parseEquityHistory(payload)
  },
}

async function runCommand(
  strategyId: string,
  command: 'pause' | 'resume' | 'terminate',
): Promise<Strategy> {
  const payload = await request(
    `${STRATEGIES_PATH}/${encodeURIComponent(strategyId)}/${command}`,
    { method: 'POST' },
  )
  return parseStrategy(payload)
}
