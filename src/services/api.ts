import type { CreateStrategyInput, Strategy } from '../types/strategy'
import type { EquityRange, EquitySeries } from '../types/equity'
import { request } from './httpClient'
import {
  parseEquityHistory,
  parseStrategy,
  parseStrategyList,
  parseTemplateList,
  type StrategyListResult,
  type TemplateListResult,
} from './schemas'

const STRATEGIES_PATH = '/v1/agent/strategies'
const EQUITY_HISTORY_PATH = `${STRATEGIES_PATH}/equity-history`
const TEMPLATES_PATH = '/v1/agent/strategy-templates'

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
    // 0~1 比例口径，调用方负责转换；留空表示不设止盈/止损。
    ...(input.takeProfitPct ? { take_profit_pct: input.takeProfitPct } : {}),
    ...(input.stopLossPct ? { stop_loss_pct: input.stopLossPct } : {}),
  }
}

export interface StrategyRepository {
  list(signal?: AbortSignal): Promise<StrategyListResult>
  listTemplates(signal?: AbortSignal): Promise<TemplateListResult>
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

  async listTemplates(signal) {
    const payload = await request(TEMPLATES_PATH, { signal })
    return parseTemplateList(payload)
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
