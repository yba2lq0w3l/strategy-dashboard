import { describe, expect, it } from 'vitest'
import { parseStrategy, parseStrategyList } from './schemas'
import { rawStrategy } from '../test/fixtures'

describe('parseStrategy', () => {
  it('把 snake_case 载荷映射为领域模型', () => {
    const strategy = parseStrategy(rawStrategy)

    expect(strategy.strategyId).toBe(rawStrategy.strategy_id)
    expect(strategy.capitalCapacity).toBe('50000')
    expect(strategy.templateId).toBe('tpl_demo')
    expect(strategy.version).toBe(1)
  })

  it('把上游大写 state 归一化为小写', () => {
    expect(parseStrategy(rawStrategy).state).toBe('active')
    expect(parseStrategy({ ...rawStrategy, state: 'PAUSED' }).state).toBe('paused')
    expect(
      parseStrategy({ ...rawStrategy, state: 'TERMINATED' }).state,
    ).toBe('terminated')
  })

  it('可空字段回落到安全默认值', () => {
    const strategy = parseStrategy({
      strategy_id: 'strat_x',
      runtime_env: 'LIVE',
      state: 'CREATED',
    })

    expect(strategy.name).toBe('strat_x')
    expect(strategy.allocation).toBe('0')
    expect(strategy.maxLeverage).toBe('1')
    expect(strategy.expiresAt).toBeNull()
    expect(strategy.allowedAssets).toBeNull()
    expect(strategy.runtimeEnv).toBe('live')
    expect(strategy.version).toBe(1)
  })

  it('兼容以 number 返回的数值字段', () => {
    const strategy = parseStrategy({ ...rawStrategy, allocation: 12345 })
    expect(strategy.allocation).toBe('12345')
  })

  it('把 Postgres numeric 的科学计数法还原成十进制字符串', () => {
    // 后端切到 Postgres 后，Decimal 序列化会产出 "1E+4" 这类写法。
    const strategy = parseStrategy({
      ...rawStrategy,
      allocation: '1E+4',
      capital_capacity: '5E+4',
      strategy_capacity: '1.0E+5',
    })

    expect(strategy.allocation).toBe('10000')
    expect(strategy.capitalCapacity).toBe('50000')
    expect(strategy.strategyCapacity).toBe('100000')
  })

  it('规范化后的数值能通过表单的纯数字校验', () => {
    const strategy = parseStrategy({ ...rawStrategy, allocation: '1E+4' })
    expect(/^\d+(\.\d+)?$/.test(strategy.allocation)).toBe(true)
  })

  it('规范化保留小数并处理负指数', () => {
    expect(parseStrategy({ ...rawStrategy, allocation: '1.25E+2' }).allocation).toBe(
      '125',
    )
    expect(parseStrategy({ ...rawStrategy, allocation: '1E-2' }).allocation).toBe(
      '0.01',
    )
  })

  it('非指数写法原样保留，不引入精度损失', () => {
    const strategy = parseStrategy({
      ...rawStrategy,
      allocation: '10000.50',
      capital_capacity: '123456789012345678901234',
    })

    expect(strategy.allocation).toBe('10000.50')
    expect(strategy.capitalCapacity).toBe('123456789012345678901234')
  })

  it('缺少 strategy_id 时抛错', () => {
    expect(() => parseStrategy({ ...rawStrategy, strategy_id: '' })).toThrow()
  })

  it('未知 state 抛错而不是静默通过', () => {
    expect(() => parseStrategy({ ...rawStrategy, state: 'ZOMBIE' })).toThrow()
  })
})

describe('parseStrategyList', () => {
  it('解析正常列表', () => {
    const result = parseStrategyList({ items: [rawStrategy] })
    expect(result.strategies).toHaveLength(1)
    expect(result.skipped).toBe(0)
  })

  it('items 为空或缺失时返回空列表', () => {
    expect(parseStrategyList({ items: [] }).strategies).toHaveLength(0)
    expect(parseStrategyList({ items: null }).strategies).toHaveLength(0)
  })

  it('跳过脏数据但保留其余条目，避免整屏失败', () => {
    const result = parseStrategyList({
      items: [rawStrategy, { strategy_id: 'bad', state: 'UNKNOWN' }],
    })

    expect(result.strategies).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('响应缺少 items 字段时抛错', () => {
    expect(() => parseStrategyList({ foo: 'bar' })).toThrow(/items/)
    expect(() => parseStrategyList('nope')).toThrow()
  })
})
