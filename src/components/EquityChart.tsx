import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EquitySeries } from '../utils/equity'
import {
  formatClock,
  formatCompactCurrency,
  formatCurrency,
  formatSignedPercent,
} from '../utils/format'

interface EquityChartProps {
  readonly series: EquitySeries
}

interface TooltipPayloadItem {
  readonly payload: {
    readonly timestamp: number
    readonly equity: number
    readonly pnl: number
    readonly drawdownPct: number
  }
}

interface EquityTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly TooltipPayloadItem[]
}

/** 十字准星 + 单点读数。图表只有一条序列，因此无需图例。 */
function EquityTooltip({ active, payload }: EquityTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload

  return (
    <div className="panel px-3 py-2 shadow-xl">
      <p className="numeric text-[10px] text-ink-faint">
        {formatClock(point.timestamp)}
      </p>
      <p className="numeric mt-1 text-sm font-semibold text-ink">
        {formatCurrency(point.equity)}
      </p>
      <p
        className={`numeric text-[11px] ${point.pnl >= 0 ? 'text-neon-soft' : 'text-ask'}`}
      >
        PnL {point.pnl >= 0 ? '+' : ''}
        {formatCurrency(point.pnl)}
      </p>
      <p className="numeric text-[10px] text-ink-faint">
        回撤 {point.drawdownPct.toFixed(2)}%
      </p>
    </div>
  )
}

export function EquityChart({ series }: EquityChartProps) {
  const data = useMemo(() => series.points.map((point) => ({ ...point })), [series])
  const isProfit = series.totalPnl >= 0
  const strokeColor = isProfit ? 'var(--color-neon)' : 'var(--color-ask)'

  const domain = useMemo(() => {
    const values = data.map((point) => point.equity)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max((max - min) * 0.18, max * 0.002)
    return [min - pad, max + pad] as const
  }, [data])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-3">
        <div>
          <p className="label-caps">Cumulative Equity</p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="numeric text-2xl font-semibold text-ink">
              {formatCurrency(series.finalEquity)}
            </span>
            <span
              className={`numeric text-sm font-semibold ${isProfit ? 'text-neon-soft' : 'text-ask'}`}
            >
              {formatSignedPercent(series.totalPnlPct)}
            </span>
          </div>
        </div>

        <dl className="flex gap-5">
          <div>
            <dt className="label-caps">Base</dt>
            <dd className="numeric text-xs text-ink-dim">
              {formatCompactCurrency(series.baseCapital)}
            </dd>
          </div>
          <div>
            <dt className="label-caps">Net PnL</dt>
            <dd
              className={`numeric text-xs ${isProfit ? 'text-neon-soft' : 'text-ask'}`}
            >
              {isProfit ? '+' : ''}
              {formatCompactCurrency(series.totalPnl)}
            </dd>
          </div>
          <div>
            <dt className="label-caps">Max DD</dt>
            <dd className="numeric text-xs text-amber-300">
              {series.maxDrawdownPct.toFixed(2)}%
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-h-[220px] flex-1 px-1 pt-3 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.42} />
                <stop offset="55%" stopColor={strokeColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(148,163,184,0.09)"
              strokeDasharray="2 6"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(value: number) => formatClock(value).slice(0, 5)}
              stroke="rgba(148,163,184,0.25)"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />

            <YAxis
              domain={domain as unknown as [number, number]}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
              stroke="rgba(148,163,184,0.25)"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={62}
            />

            <Tooltip
              content={<EquityTooltip />}
              cursor={{ stroke: 'rgba(99,102,241,0.55)', strokeDasharray: '3 3' }}
            />

            <ReferenceLine
              y={series.baseCapital}
              stroke="rgba(148,163,184,0.35)"
              strokeDasharray="4 4"
            />

            <Area
              type="monotone"
              dataKey="equity"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#equityFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-void)' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
