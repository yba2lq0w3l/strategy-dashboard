import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  formatClock,
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
  formatLeverage,
  formatPercent,
  formatRelativeTime,
  formatSignedPercent,
  parseAmount,
  truncateId,
} from './format'

describe('parseAmount', () => {
  it('解析数字字符串', () => {
    expect(parseAmount('10000')).toBe(10000)
    expect(parseAmount('1234.56')).toBe(1234.56)
  })

  it('对脏数据返回 0 而不是 NaN', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
    expect(parseAmount(null)).toBe(0)
    expect(parseAmount(undefined)).toBe(0)
    expect(parseAmount(Number.NaN)).toBe(0)
  })

  it('接受 number 输入', () => {
    expect(parseAmount(42)).toBe(42)
  })
})

describe('formatCompactCurrency', () => {
  it('按量级压缩', () => {
    expect(formatCompactCurrency('1500000000')).toBe('$1.50B')
    expect(formatCompactCurrency('1234567')).toBe('$1.23M')
    expect(formatCompactCurrency('50000')).toBe('$50.00K')
    expect(formatCompactCurrency('999')).toBe('$999')
  })

  it('保留负号', () => {
    expect(formatCompactCurrency(-2500000)).toBe('-$2.50M')
  })
})

describe('formatCurrency', () => {
  it('输出千分位', () => {
    expect(formatCurrency('1234567')).toBe('$1,234,567')
  })
})

describe('formatPercent / formatSignedPercent', () => {
  it('格式化百分比', () => {
    expect(formatPercent(66.66)).toBe('66.7%')
    expect(formatPercent(Number.NaN)).toBe('—')
  })

  it('正数带 + 号', () => {
    expect(formatSignedPercent(3.14159)).toBe('+3.14%')
    expect(formatSignedPercent(-2)).toBe('-2.00%')
  })
})

describe('formatLeverage', () => {
  it('把纯数值转成倍数写法', () => {
    expect(formatLeverage('3')).toBe('3.0x')
    expect(formatLeverage(2.5)).toBe('2.5x')
  })

  it('非法或非正值返回占位符', () => {
    expect(formatLeverage('0')).toBe('—')
    expect(formatLeverage(null)).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('无值或非法值返回占位符', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })

  it('合法 ISO 时间输出可读文本', () => {
    expect(formatDateTime('2026-12-31T00:00:00Z')).toContain('2026')
  })
})

describe('daysUntil', () => {
  const now = Date.parse('2026-08-08T00:00:00Z')

  it('计算剩余天数', () => {
    expect(daysUntil('2026-08-11T00:00:00Z', now)).toBe(3)
  })

  it('已过期返回负数', () => {
    expect(daysUntil('2026-08-06T00:00:00Z', now)).toBe(-2)
  })

  it('无到期时间返回 null', () => {
    expect(daysUntil(null, now)).toBeNull()
    expect(daysUntil('bad', now)).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-08-08T12:00:00Z')

  it('覆盖各时间量级', () => {
    expect(formatRelativeTime(null, now)).toBe('尚未同步')
    expect(formatRelativeTime(now, now)).toBe('刚刚')
    expect(formatRelativeTime(now - 15_000, now)).toBe('15 秒前')
    expect(formatRelativeTime(now - 120_000, now)).toBe('2 分钟前')
    expect(formatRelativeTime(now - 7_200_000, now)).toBe('2 小时前')
  })
})

describe('formatClock', () => {
  it('非法时间戳返回占位符', () => {
    expect(formatClock(Number.NaN)).toBe('--:--:--')
  })

  it('输出 HH:MM:SS', () => {
    expect(formatClock(Date.now())).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('truncateId', () => {
  it('长 ID 中间省略', () => {
    expect(truncateId('strat_03fc7bf3153887810db38c47')).toBe('strat_03fc…8c47')
  })

  it('短 ID 原样返回', () => {
    expect(truncateId('short')).toBe('short')
  })
})
