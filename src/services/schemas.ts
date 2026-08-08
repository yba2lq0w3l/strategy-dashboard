import { z } from 'zod'
import type { Strategy } from '../types/strategy'

/**
 * 上游响应的边界校验。所有外部数据都必须先过这里再进入 UI。
 *
 * 上游实际返回与需求文档的差异（已通过 Staging 实测确认）：
 * - `state` 为大写枚举，这里统一小写化；
 * - `expires_at` / `allowed_assets` / `template_id` 可为 null；
 * - 数值型字段以字符串返回，个别环境可能返回 number，故做联合兼容。
 */

/**
 * 把数值字段规范化为普通十进制字符串。
 *
 * 后端从内存存储切到 Postgres 后，numeric 列经 Decimal 序列化会变成科学计数法
 * （`"10000"` → `"1E+4"`、`"100000"` → `"1.0E+5"`）。展示与聚合能容忍，但
 * ALLOCATE 弹窗会把它原样预填进输入框，再被表单的纯数字校验拒绝。
 * 在边界层归一化，领域模型里就只存在一种数值形态。
 *
 * 只在检测到指数记法时才做转换，其余保持后端原样，避免无谓的精度损失。
 */
function normalizeDecimalText(raw: string | number): string {
  const text = String(raw).trim()
  if (!/e/i.test(text)) return text

  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return text

  return parsed.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 20,
  })
}

const numericText = z
  .union([z.string(), z.number()])
  .transform(normalizeDecimalText)

const lowerCaseText = z.string().transform((value) => value.toLowerCase())

const strategyStateSchema = lowerCaseText.pipe(
  z.enum(['created', 'active', 'paused', 'terminated']),
)

const runtimeEnvSchema = lowerCaseText.pipe(
  z.enum(['live', 'paper', 'backtest']),
)

export const strategySchema = z
  .object({
    strategy_id: z.string().min(1),
    user_id: z.string().nullish(),
    agent_id: z.string().nullish(),
    name: z.string().nullish(),
    template_id: z.string().nullish(),
    runtime_env: runtimeEnvSchema,
    allocation: numericText.nullish(),
    capital_capacity: numericText.nullish(),
    strategy_capacity: numericText.nullish(),
    max_leverage: numericText.nullish(),
    allowed_assets: z.array(z.string()).nullish(),
    expires_at: z.string().nullish(),
    state: strategyStateSchema,
    version: z.number().int().nullish(),
  })
  .transform<Strategy>((raw) => ({
    strategyId: raw.strategy_id,
    userId: raw.user_id ?? null,
    agentId: raw.agent_id ?? null,
    name: raw.name ?? raw.strategy_id,
    templateId: raw.template_id ?? null,
    runtimeEnv: raw.runtime_env,
    allocation: raw.allocation ?? '0',
    capitalCapacity: raw.capital_capacity ?? '0',
    strategyCapacity: raw.strategy_capacity ?? '0',
    maxLeverage: raw.max_leverage ?? '1',
    allowedAssets: raw.allowed_assets ?? null,
    expiresAt: raw.expires_at ?? null,
    state: raw.state,
    version: raw.version ?? 1,
  }))

// items 必须存在（值可为 null）：整体缺字段说明响应结构不对，应当快速失败。
const strategyListSchema = z.object({
  items: z.array(z.unknown()).nullable(),
})

export interface StrategyListResult {
  readonly strategies: readonly Strategy[]
  /** 未通过校验、已被跳过的条目数量。大屏不因单条脏数据整体失败。 */
  readonly skipped: number
}

export function parseStrategyList(payload: unknown): StrategyListResult {
  const envelope = strategyListSchema.safeParse(payload)
  if (!envelope.success) {
    throw new Error('策略列表响应格式非法：缺少 items 字段')
  }

  const items = envelope.data.items ?? []
  const strategies: Strategy[] = []
  let skipped = 0

  for (const item of items) {
    const parsed = strategySchema.safeParse(item)
    if (parsed.success) {
      strategies.push(parsed.data)
    } else {
      skipped += 1
    }
  }

  return { strategies, skipped }
}

export function parseStrategy(payload: unknown): Strategy {
  const parsed = strategySchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('策略响应格式非法，无法解析该策略对象')
  }
  return parsed.data
}
