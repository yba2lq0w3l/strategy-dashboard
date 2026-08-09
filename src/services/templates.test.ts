import { describe, expect, it } from 'vitest'
import { parseTemplateList } from './schemas'

/** 取自 Staging 的真实模板载荷（网格交易）。 */
const rawTemplate = {
  template_id: 'grid_trading_v1',
  name: '网格交易',
  description: '在设定价格区间内等分挂单，震荡行情中低买高卖赚取网格差价。',
  recommended_leverage: '2',
  default_allocation: '1000',
  risk_level: 'MEDIUM',
  params_schema: {
    type: 'object',
    required: ['lower_price', 'upper_price', 'grid_count'],
    properties: {
      lower_price: { type: 'string', description: '网格区间下沿价格' },
      upper_price: { type: 'string', description: '网格区间上沿价格' },
      grid_count: {
        type: 'integer',
        minimum: 2,
        maximum: 200,
        description: '网格数量',
      },
      order_size: { type: 'string', description: '每格下单数量，留空则按额度均分' },
    },
  },
}

describe('parseTemplateList', () => {
  it('映射模板核心字段', () => {
    const { templates } = parseTemplateList({ items: [rawTemplate] })
    const template = templates[0]

    expect(template.templateId).toBe('grid_trading_v1')
    expect(template.name).toBe('网格交易')
    expect(template.recommendedLeverage).toBe('2')
    expect(template.defaultAllocation).toBe('1000')
    expect(template.riskLevel).toBe('MEDIUM')
  })

  it('把 params_schema 扁平化成字段列表', () => {
    const { templates } = parseTemplateList({ items: [rawTemplate] })
    const names = templates[0].params.map((param) => param.name)

    expect(names).toHaveLength(4)
    expect(names).toEqual(
      expect.arrayContaining(['lower_price', 'upper_price', 'grid_count']),
    )
  })

  it('必填参数排在前面', () => {
    const { templates } = parseTemplateList({ items: [rawTemplate] })
    const params = templates[0].params

    expect(params.slice(0, 3).every((param) => param.required)).toBe(true)
    expect(params[3].name).toBe('order_size')
    expect(params[3].required).toBe(false)
  })

  it('保留数值区间约束', () => {
    const { templates } = parseTemplateList({ items: [rawTemplate] })
    const grid = templates[0].params.find((param) => param.name === 'grid_count')

    expect(grid?.minimum).toBe(2)
    expect(grid?.maximum).toBe(200)
    expect(grid?.type).toBe('integer')
  })

  it('风险等级大小写归一化', () => {
    const { templates } = parseTemplateList({
      items: [{ ...rawTemplate, risk_level: 'high' }],
    })
    expect(templates[0].riskLevel).toBe('HIGH')
  })

  it('未知风险等级的模板被跳过，其余仍可用', () => {
    const result = parseTemplateList({
      items: [rawTemplate, { ...rawTemplate, template_id: 'x', risk_level: 'EXTREME' }],
    })

    expect(result.templates).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('params_schema 缺失或非法时降级为空参数列表', () => {
    const { templates } = parseTemplateList({
      items: [
        { ...rawTemplate, params_schema: null },
        { ...rawTemplate, template_id: 'y', params_schema: 'nonsense' },
      ],
    })

    expect(templates).toHaveLength(2)
    expect(templates[0].params).toHaveLength(0)
    expect(templates[1].params).toHaveLength(0)
  })

  it('空列表安全', () => {
    expect(parseTemplateList({ items: [] }).templates).toHaveLength(0)
    expect(parseTemplateList({ items: null }).templates).toHaveLength(0)
  })

  it('缺少 items 字段时抛错', () => {
    expect(() => parseTemplateList({ foo: 1 })).toThrow(/items/)
  })
})
