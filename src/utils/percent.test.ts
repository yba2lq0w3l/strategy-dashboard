import { describe, expect, it } from 'vitest'
import { formatRatioAsPercent, percentToRatio, ratioToPercent } from './percent'

describe('percentToRatio', () => {
  it('把百分比转成上游要求的 0~1 比例', () => {
    expect(percentToRatio(10)).toBe('0.1')
    expect(percentToRatio(5)).toBe('0.05')
    expect(percentToRatio(15)).toBe('0.15')
    expect(percentToRatio(100)).toBe('1')
  })

  it('不产生浮点尾巴', () => {
    // 0.1 而不是 0.10000000000000001
    expect(percentToRatio(10)).toBe('0.1')
    expect(percentToRatio(29)).toBe('0.29')
    expect(percentToRatio(0.3)).toBe('0.003')
  })

  it('处理小数百分比', () => {
    expect(percentToRatio(2.5)).toBe('0.025')
    expect(percentToRatio(12.75)).toBe('0.1275')
  })

  it('非有限值退化为 0', () => {
    expect(percentToRatio(Number.NaN)).toBe('0')
    expect(percentToRatio(Number.POSITIVE_INFINITY)).toBe('0')
  })
})

describe('ratioToPercent', () => {
  it('把比例还原成百分比', () => {
    expect(ratioToPercent('0.1')).toBe(10)
    expect(ratioToPercent('0.05')).toBe(5)
    expect(ratioToPercent(0.125)).toBe(12.5)
  })

  it('空值返回 null 而不是 0', () => {
    expect(ratioToPercent(null)).toBeNull()
    expect(ratioToPercent(undefined)).toBeNull()
    expect(ratioToPercent('')).toBeNull()
  })

  it('非法值返回 null', () => {
    expect(ratioToPercent('abc')).toBeNull()
  })

  it('与 percentToRatio 互为逆运算', () => {
    for (const percent of [1, 5, 10, 15, 33.3, 100]) {
      expect(ratioToPercent(percentToRatio(percent))).toBeCloseTo(percent, 4)
    }
  })
})

describe('formatRatioAsPercent', () => {
  it('展示为带 % 的文本', () => {
    expect(formatRatioAsPercent('0.1')).toBe('10%')
    expect(formatRatioAsPercent('0.055')).toBe('5.5%')
  })

  it('未设置时返回占位符', () => {
    expect(formatRatioAsPercent(null)).toBe('未设')
    expect(formatRatioAsPercent('', '—')).toBe('—')
  })
})
