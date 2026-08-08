/** 权益曲线的时间范围档位：点数 × 间隔决定曲线覆盖的时间跨度。 */
export interface ChartRange {
  readonly label: string
  readonly points: number
  readonly intervalMs: number
}

export const CHART_RANGES: readonly ChartRange[] = [
  { label: '1H', points: 60, intervalMs: 60_000 },
  { label: '6H', points: 72, intervalMs: 5 * 60_000 },
  { label: '24H', points: 96, intervalMs: 15 * 60_000 },
]
