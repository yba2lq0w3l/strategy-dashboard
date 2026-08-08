/** 展示层格式化工具。所有输入都可能是脏数据，函数需保证不抛异常。 */

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const parsed = Number.parseFloat(value.replace(/[^0-9eE+\-.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const COMPACT_UNITS = [
  { limit: 1e12, suffix: 'T' },
  { limit: 1e9, suffix: 'B' },
  { limit: 1e6, suffix: 'M' },
  { limit: 1e3, suffix: 'K' },
] as const

/** 紧凑金额：1234567 -> $1.23M。大屏卡片使用。 */
export function formatCompactCurrency(
  value: string | number | null | undefined,
  currency = '$',
): string {
  const amount = parseAmount(value)
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)

  for (const unit of COMPACT_UNITS) {
    if (abs >= unit.limit) {
      return `${sign}${currency}${(abs / unit.limit).toFixed(2)}${unit.suffix}`
    }
  }

  return `${sign}${currency}${abs.toFixed(abs < 100 ? 2 : 0)}`
}

/** 完整金额：1234567 -> $1,234,567。表格明细使用。 */
export function formatCurrency(
  value: string | number | null | undefined,
  currency = '$',
): string {
  const amount = parseAmount(value)
  return `${currency}${amount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

/** 上游 max_leverage 是纯数值字符串（"3"），展示为 "3.0x"。 */
export function formatLeverage(value: string | number | null | undefined): string {
  const parsed = parseAmount(value)
  if (parsed <= 0) return '—'
  return `${parsed.toFixed(1)}x`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** 到期倒计时，用于风险提示。返回 null 表示无到期时间或已过期。 */
export function daysUntil(
  iso: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null
  return Math.floor((target - now) / 86_400_000)
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('en-GB', { hour12: false })
}

/** "12 秒前" 形式的相对时间，用于最后同步时刻。 */
export function formatRelativeTime(
  timestamp: number | null,
  now: number = Date.now(),
): string {
  if (timestamp === null) return '尚未同步'
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 2) return '刚刚'
  if (seconds < 60) return `${seconds} 秒前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  return `${Math.floor(minutes / 60)} 小时前`
}

export function truncateId(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}
