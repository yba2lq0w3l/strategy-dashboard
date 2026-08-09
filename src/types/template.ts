/** 官方策略模板领域模型，来自 `GET /v1/agent/strategy-templates`。 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export const RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH']

/**
 * 模板参数字段。
 *
 * 上游用 `params_schema`（一段 JSON Schema）描述每个模板需要的参数，
 * 各模板结构不同。这里扁平化成字段列表用于只读展示——
 * ⚠️ 创建接口 `StrategyCreateRequest` 目前**没有**接收这些参数的字段，
 * 所以它们只能作为「该模板需要什么」的说明呈现，暂时无法提交。
 */
export interface TemplateParamField {
  readonly name: string
  readonly type: string
  readonly description: string
  readonly required: boolean
  readonly minimum: number | null
  readonly maximum: number | null
}

export interface StrategyTemplate {
  readonly templateId: string
  readonly name: string
  readonly description: string
  /** 推荐杠杆，纯数值字符串。 */
  readonly recommendedLeverage: string
  /** 建议授权额度，纯数值字符串。 */
  readonly defaultAllocation: string
  readonly riskLevel: RiskLevel
  readonly params: readonly TemplateParamField[]
}

/**
 * 一键启动模板的表单输入。
 *
 * ⚠️ 止盈/止损在 UI 上以**百分比**收集（用户输入 10 表示 10%），
 * 提交前必须转成上游要求的 0~1 比例（0.1）。后端不校验该范围，
 * 前端是唯一防线——直接把 10 提交上去会变成 1000% 止盈。
 */
export interface LaunchTemplateInput {
  readonly template: StrategyTemplate
  readonly name: string
  readonly allocation: string
  readonly takeProfitPct: string
  readonly stopLossPct: string
  readonly allowedAssets: readonly string[]
}
