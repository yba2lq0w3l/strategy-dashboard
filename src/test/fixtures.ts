import type { Strategy } from '../types/strategy'

/** 取自 Staging 真实响应的样例载荷（原始 snake_case + 大写 state）。 */
export const rawStrategy = {
  strategy_id: 'strat_03fc7bf3153887810db38c47',
  user_id: 'u_dev',
  agent_id: 'agent-test-001',
  name: 'Probe Alpha',
  template_id: 'tpl_demo',
  runtime_env: 'paper',
  allocation: '10000',
  capital_capacity: '50000',
  strategy_capacity: '100000',
  max_leverage: '3',
  allowed_assets: null,
  expires_at: null,
  state: 'ACTIVE',
  version: 1,
} as const

export function makeStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    strategyId: 'strat_test_0001',
    userId: 'u_dev',
    agentId: 'agent-test-001',
    name: 'Alpha Momentum',
    templateId: 'tpl_demo',
    runtimeEnv: 'paper',
    allocation: '10000',
    capitalCapacity: '50000',
    strategyCapacity: '100000',
    maxLeverage: '3',
    allowedAssets: null,
    expiresAt: null,
    state: 'active',
    version: 1,
    takeProfitPct: null,
    stopLossPct: null,
    metrics: null,
    ...overrides,
  }
}
