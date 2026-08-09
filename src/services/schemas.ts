import { z } from 'zod'
import type { Strategy, StrategyMetrics } from '../types/strategy'
import type { EquityPoint, EquitySeries } from '../types/equity'
import type {
  StrategyTemplate,
  TemplateParamField,
} from '../types/template'
import { summarizeEquity } from '../utils/equity'

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

const finiteNumber = z.number().refine(Number.isFinite, '必须是有限数值')

/** 比例（0~1）→ 百分比。上游的 win_rate / max_drawdown 用的是比例口径。 */
function ratioToPercent(ratio: number): number {
  return Math.round(ratio * 100 * 1e6) / 1e6
}

const metricsShape = {
  total_pnl: finiteNumber.nullish(),
  total_pnl_pct: finiteNumber.nullish(),
  win_rate: finiteNumber.nullish(),
  max_drawdown: finiteNumber.nullish(),
}

interface RawMetrics {
  total_pnl?: number | null
  total_pnl_pct?: number | null
  win_rate?: number | null
  max_drawdown?: number | null
}

/**
 * 四个字段整体缺失时返回 null（UI 渲染「暂无数据」而不是一片 0）；
 * 只要有任意一个存在，就补齐其余为 0 并统一成百分比口径。
 */
function toMetrics(raw: RawMetrics): StrategyMetrics | null {
  const present =
    raw.total_pnl != null ||
    raw.total_pnl_pct != null ||
    raw.win_rate != null ||
    raw.max_drawdown != null

  if (!present) return null

  return {
    totalPnl: raw.total_pnl ?? 0,
    // total_pnl_pct 本身就是百分比，不能再乘 100。
    totalPnlPct: raw.total_pnl_pct ?? 0,
    winRatePct: ratioToPercent(raw.win_rate ?? 0),
    maxDrawdownPct: ratioToPercent(raw.max_drawdown ?? 0),
  }
}

export const strategySchema = z
  .object({
    ...metricsShape,
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
    // OpenAPI 的 StrategyView 未声明这两个字段，但实测创建后确实会回显。
    take_profit_pct: numericText.nullish(),
    stop_loss_pct: numericText.nullish(),
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
    // 保持上游的 0~1 比例口径，展示时才转百分比。
    takeProfitPct: raw.take_profit_pct ?? null,
    stopLossPct: raw.stop_loss_pct ?? null,
    state: raw.state,
    version: raw.version ?? 1,
    metrics: toMetrics(raw),
  }))

// items 必须存在（值可为 null）：整体缺字段说明响应结构不对，应当快速失败。
const strategyListSchema = z.object({
  items: z.array(z.unknown()).nullable(),
  summary: z.object(metricsShape).nullish(),
})

export interface StrategyListResult {
  readonly strategies: readonly Strategy[]
  /** 该 Agent 全部策略合并后的整体收益统计，上游未返回时为 null。 */
  readonly summary: StrategyMetrics | null
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

  return {
    strategies,
    summary: envelope.data.summary ? toMetrics(envelope.data.summary) : null,
    skipped,
  }
}

export function parseStrategy(payload: unknown): Strategy {
  const parsed = strategySchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('策略响应格式非法，无法解析该策略对象')
  }
  return parsed.data
}

const riskLevelSchema = z
  .string()
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(['LOW', 'MEDIUM', 'HIGH']))

/** params_schema 里单个属性的形状，字段按 JSON Schema 约定，全部可选。 */
const paramPropertySchema = z.object({
  type: z.string().nullish(),
  description: z.string().nullish(),
  minimum: z.number().nullish(),
  maximum: z.number().nullish(),
})

const paramsSchemaShape = z.object({
  required: z.array(z.string()).nullish(),
  properties: z.record(z.string(), z.unknown()).nullish(),
})

/**
 * 把模板的 JSON Schema 片段扁平化成可渲染的字段列表。
 * 各模板结构不同，任何一处不合预期都只跳过该字段，不影响模板本身可用。
 */
function toParamFields(rawSchema: unknown): TemplateParamField[] {
  const parsed = paramsSchemaShape.safeParse(rawSchema)
  if (!parsed.success) return []

  const required = new Set(parsed.data.required ?? [])
  const properties = parsed.data.properties ?? {}
  const fields: TemplateParamField[] = []

  for (const [name, rawProp] of Object.entries(properties)) {
    const prop = paramPropertySchema.safeParse(rawProp)
    if (!prop.success) continue

    fields.push({
      name,
      type: prop.data.type ?? 'string',
      description: prop.data.description ?? '',
      required: required.has(name),
      minimum: prop.data.minimum ?? null,
      maximum: prop.data.maximum ?? null,
    })
  }

  // 必填参数排在前面，便于用户一眼看到模板的关键输入。
  return fields.toSorted((a, b) => Number(b.required) - Number(a.required))
}

const templateSchema = z
  .object({
    template_id: z.string().min(1),
    name: z.string().nullish(),
    description: z.string().nullish(),
    recommended_leverage: numericText.nullish(),
    default_allocation: numericText.nullish(),
    risk_level: riskLevelSchema,
    params_schema: z.unknown().nullish(),
  })
  .transform<StrategyTemplate>((raw) => ({
    templateId: raw.template_id,
    name: raw.name ?? raw.template_id,
    description: raw.description ?? '',
    recommendedLeverage: raw.recommended_leverage ?? '1',
    defaultAllocation: raw.default_allocation ?? '0',
    riskLevel: raw.risk_level,
    params: toParamFields(raw.params_schema),
  }))

const templateListSchema = z.object({
  items: z.array(z.unknown()).nullable(),
})

export interface TemplateListResult {
  readonly templates: readonly StrategyTemplate[]
  readonly skipped: number
}

/** 逐条校验，坏模板只跳过自己，不影响其余模板可选。 */
export function parseTemplateList(payload: unknown): TemplateListResult {
  const envelope = templateListSchema.safeParse(payload)
  if (!envelope.success) {
    throw new Error('策略模板响应格式非法：缺少 items 字段')
  }

  const templates: StrategyTemplate[] = []
  let skipped = 0

  for (const item of envelope.data.items ?? []) {
    const parsed = templateSchema.safeParse(item)
    if (parsed.success) templates.push(parsed.data)
    else skipped += 1
  }

  return { templates, skipped }
}

const equityPointSchema = z
  .object({
    timestamp: finiteNumber,
    equity: finiteNumber,
    pnl: finiteNumber,
    drawdown_pct: finiteNumber,
  })
  .transform<EquityPoint>((raw) => ({
    // 上游是 Unix 秒，前端统一用毫秒。
    timestamp: raw.timestamp * 1000,
    equity: raw.equity,
    pnl: raw.pnl,
    drawdownPct: raw.drawdown_pct,
  }))

// 与 items 同样的约定：points 必须存在（值可为 null），
// 整体缺字段说明响应结构不对，应当快速失败而不是静默画空图。
const equityHistorySchema = z.object({
  points: z.array(z.unknown()).nullable(),
})

/**
 * 解析权益曲线。逐点校验并跳过坏点——大屏宁可少画一个点，
 * 也不该因为一条脏采样整条曲线消失。点按时间升序排列，
 * 否则折线会自我交叉。
 */
export function parseEquityHistory(payload: unknown): EquitySeries {
  const envelope = equityHistorySchema.safeParse(payload)
  if (!envelope.success) {
    throw new Error('权益曲线响应格式非法：缺少 points 字段')
  }

  const points: EquityPoint[] = []
  for (const raw of envelope.data.points ?? []) {
    const parsed = equityPointSchema.safeParse(raw)
    if (parsed.success) points.push(parsed.data)
  }

  const ordered = points.toSorted((a, b) => a.timestamp - b.timestamp)
  return { points: ordered, summary: summarizeEquity(ordered) }
}
