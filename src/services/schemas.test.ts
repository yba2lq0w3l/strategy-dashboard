import { describe, expect, it } from 'vitest'
import { parseEquityHistory, parseStrategy, parseStrategyList } from './schemas'
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

  it('解析顶层 summary 并归一化单位', () => {
    const result = parseStrategyList({
      items: [rawStrategy],
      summary: {
        total_pnl: 805.5,
        total_pnl_pct: 3.66,
        win_rate: 0.666,
        max_drawdown: 0.125,
      },
    })

    expect(result.summary).toEqual({
      totalPnl: 805.5,
      totalPnlPct: 3.66,
      winRatePct: 66.6,
      maxDrawdownPct: 12.5,
    })
  })

  it('缺少 summary 时为 null', () => {
    expect(parseStrategyList({ items: [] }).summary).toBeNull()
  })
})

describe('策略收益字段的单位归一化', () => {
  // 上游把两种单位混在同一个对象里，这是最容易搞错的地方。
  it('win_rate / max_drawdown 是 0~1 比例，需 ×100', () => {
    const strategy = parseStrategy({
      ...rawStrategy,
      win_rate: 0.666,
      max_drawdown: 0.125,
    })

    expect(strategy.metrics?.winRatePct).toBe(66.6)
    expect(strategy.metrics?.maxDrawdownPct).toBe(12.5)
  })

  it('total_pnl_pct 本身就是百分比，不能再乘 100', () => {
    const strategy = parseStrategy({ ...rawStrategy, total_pnl_pct: 3.66 })
    expect(strategy.metrics?.totalPnlPct).toBe(3.66)
  })

  it('比例上下界映射正确', () => {
    expect(parseStrategy({ ...rawStrategy, win_rate: 1 }).metrics?.winRatePct).toBe(
      100,
    )
    expect(parseStrategy({ ...rawStrategy, win_rate: 0 }).metrics?.winRatePct).toBe(
      0,
    )
  })

  it('收益字段全部缺失时 metrics 为 null，避免把 0 当成真实读数', () => {
    expect(parseStrategy(rawStrategy).metrics).toBeNull()
  })

  it('只要有任意一个字段就补齐其余为 0', () => {
    const strategy = parseStrategy({ ...rawStrategy, total_pnl: 100 })

    expect(strategy.metrics).toEqual({
      totalPnl: 100,
      totalPnlPct: 0,
      winRatePct: 0,
      maxDrawdownPct: 0,
    })
  })

  it('全 0 的真实统计仍视为有数据', () => {
    const strategy = parseStrategy({
      ...rawStrategy,
      total_pnl: 0,
      total_pnl_pct: 0,
      win_rate: 0,
      max_drawdown: 0,
    })

    expect(strategy.metrics).not.toBeNull()
    expect(strategy.metrics?.totalPnl).toBe(0)
  })
})

describe('parseEquityHistory', () => {
  const rawPoint = {
    timestamp: 1_800_000_000,
    equity: 10_500,
    pnl: 500,
    drawdown_pct: 1.2,
  }

  it('把 Unix 秒转成毫秒并映射字段', () => {
    const series = parseEquityHistory({ points: [rawPoint] })

    expect(series.points).toHaveLength(1)
    expect(series.points[0]).toEqual({
      timestamp: 1_800_000_000_000,
      equity: 10_500,
      pnl: 500,
      drawdownPct: 1.2,
    })
  })

  it('空 points 返回空曲线且 summary 为 null', () => {
    const series = parseEquityHistory({ points: [] })

    expect(series.points).toHaveLength(0)
    expect(series.summary).toBeNull()
  })

  it('points 为 null 时同样安全', () => {
    expect(parseEquityHistory({ points: null }).points).toHaveLength(0)
  })

  it('按时间升序排列，避免折线自我交叉', () => {
    const series = parseEquityHistory({
      points: [
        { ...rawPoint, timestamp: 300 },
        { ...rawPoint, timestamp: 100 },
        { ...rawPoint, timestamp: 200 },
      ],
    })

    expect(series.points.map((p) => p.timestamp)).toEqual([
      100_000, 200_000, 300_000,
    ])
  })

  it('跳过坏点但保留其余，不让整条曲线消失', () => {
    const series = parseEquityHistory({
      points: [rawPoint, { timestamp: 'bad', equity: null }, rawPoint],
    })

    expect(series.points).toHaveLength(2)
  })

  it('附带由曲线派生的 summary', () => {
    const series = parseEquityHistory({
      points: [
        { timestamp: 100, equity: 10_000, pnl: 0, drawdown_pct: 0 },
        { timestamp: 200, equity: 11_000, pnl: 1_000, drawdown_pct: 2.5 },
      ],
    })

    expect(series.summary?.baseEquity).toBe(10_000)
    expect(series.summary?.totalPnl).toBe(1_000)
    expect(series.summary?.totalPnlPct).toBe(10)
    expect(series.summary?.maxDrawdownPct).toBe(2.5)
  })

  it('缺少 points 字段时抛错', () => {
    expect(() => parseEquityHistory({ foo: 1 })).toThrow(/points/)
  })
})
