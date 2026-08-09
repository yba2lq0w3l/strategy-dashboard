import type { EquityRange } from '../types/equity'

/**
 * 权益曲线时间窗口。`value` 必须与上游 `range` 参数完全一致
 * （非法值会返回 400 "range 必须是 ('1h', '6h', '24h') 之一"）。
 */
export interface ChartRangeOption {
  readonly label: string
  readonly value: EquityRange
}

export const CHART_RANGES: readonly ChartRangeOption[] = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
]

export const DEFAULT_CHART_RANGE: EquityRange = '6h'
