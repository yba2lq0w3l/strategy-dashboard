import { describe, expect, it } from 'vitest'
import { activeRatio, computePortfolioMetrics } from './metrics'
import { makeStrategy } from '../test/fixtures'

describe('computePortfolioMetrics', () => {
  it('空列表返回全零指标', () => {
    const metrics = computePortfolioMetrics([])
    expect(metrics.total).toBe(0)
    expect(metrics.totalAllocated).toBe(0)
    expect(metrics.capacityUsagePct).toBe(0)
    expect(metrics.maxLeverage).toBe(0)
  })

  it('按状态计数并汇总资金', () => {
    const metrics = computePortfolioMetrics([
      makeStrategy({ strategyId: 'a', state: 'active', allocation: '10000' }),
      makeStrategy({ strategyId: 'b', state: 'paused', allocation: '5000' }),
      makeStrategy({
        strategyId: 'c',
        state: 'terminated',
        allocation: '1000',
        runtimeEnv: 'live',
      }),
    ])

    expect(metrics.total).toBe(3)
    expect(metrics.activeCount).toBe(1)
    expect(metrics.pausedCount).toBe(1)
    expect(metrics.terminatedCount).toBe(1)
    expect(metrics.liveCount).toBe(1)
    expect(metrics.totalAllocated).toBe(16_000)
  })

  it('计算容量使用率', () => {
    const metrics = computePortfolioMetrics([
      makeStrategy({ allocation: '25000', capitalCapacity: '50000' }),
    ])
    expect(metrics.capacityUsagePct).toBeCloseTo(50)
  })

  it('容量为 0 时使用率不产生除零', () => {
    const metrics = computePortfolioMetrics([
      makeStrategy({ allocation: '100', capitalCapacity: '0' }),
    ])
    expect(metrics.capacityUsagePct).toBe(0)
  })

  it('计算平均与最大杠杆', () => {
    const metrics = computePortfolioMetrics([
      makeStrategy({ strategyId: 'a', maxLeverage: '2' }),
      makeStrategy({ strategyId: 'b', maxLeverage: '4' }),
    ])

    expect(metrics.avgLeverage).toBe(3)
    expect(metrics.maxLeverage).toBe(4)
  })
})

describe('activeRatio', () => {
  it('返回活跃占比', () => {
    const metrics = computePortfolioMetrics([
      makeStrategy({ strategyId: 'a', state: 'active' }),
      makeStrategy({ strategyId: 'b', state: 'paused' }),
    ])
    expect(activeRatio(metrics)).toBe(0.5)
  })

  it('空组合返回 0', () => {
    expect(activeRatio(computePortfolioMetrics([]))).toBe(0)
  })
})
