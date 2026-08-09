/** 权益曲线领域模型。数据全部来自 `/v1/agent/strategies/equity-history`。 */

/** 后端支持的时间窗口，取值必须与上游一致，否则返回 400。 */
export type EquityRange = '1h' | '6h' | '24h'

export const EQUITY_RANGES: readonly EquityRange[] = ['1h', '6h', '24h']

export function isEquityRange(value: string): value is EquityRange {
  return (EQUITY_RANGES as readonly string[]).includes(value)
}

export interface EquityPoint {
  /** 毫秒时间戳。上游返回的是 Unix 秒，解析层已 ×1000。 */
  readonly timestamp: number
  /** 该时刻净值。 */
  readonly equity: number
  /** 相对窗口首点的收益金额。 */
  readonly pnl: number
  /** 相对历史峰值的回撤百分比，1.2 表示 1.2%。 */
  readonly drawdownPct: number
}

/** 由曲线点派生的窗口内汇总，保证展示的数字与画出来的线一致。 */
export interface EquitySummary {
  readonly baseEquity: number
  readonly finalEquity: number
  readonly totalPnl: number
  readonly totalPnlPct: number
  readonly maxDrawdownPct: number
}

export interface EquitySeries {
  readonly points: readonly EquityPoint[]
  /** 无数据点时为 null，UI 需渲染空态而不是显示 0。 */
  readonly summary: EquitySummary | null
}
