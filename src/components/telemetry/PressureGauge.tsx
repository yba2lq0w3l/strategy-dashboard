interface PressureGaugeProps {
  readonly bidPressure: number
  readonly askPressure: number
  readonly imbalance: number
}

/**
 * 买卖压力对比条。
 *
 * 两段填充之间留 2px 表面间隙，且两侧都有直标文字（BID/ASK + 百分比），
 * 因此颜色只是辅助编码——色觉障碍用户依靠位置与文字即可读出。
 */
export function PressureGauge({
  bidPressure,
  askPressure,
  imbalance,
}: PressureGaugeProps) {
  // 归一化后再取整，保证两段宽度之和恰好是 100%，不会出现 1px 缝隙或溢出。
  const total = bidPressure + askPressure
  const bidPct = total > 0 ? Math.round((bidPressure / total) * 100) : 50
  const askPct = 100 - bidPct
  const dominant = bidPct >= askPct ? 'BID' : 'ASK'

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <span className="label-caps">Bid</span>
          <p className="numeric text-lg leading-tight font-semibold text-bid">
            {bidPct}%
          </p>
        </div>
        <div className="text-center">
          <span className="label-caps">Imbalance</span>
          <p className="numeric text-sm leading-tight text-ink">
            {imbalance.toFixed(2)}x
          </p>
        </div>
        <div className="text-right">
          <span className="label-caps">Ask</span>
          <p className="numeric text-lg leading-tight font-semibold text-ask">
            {askPct}%
          </p>
        </div>
      </div>

      <div
        className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-white/[0.05]"
        role="img"
        aria-label={`买盘压力 ${bidPct}%，卖盘压力 ${askPct}%，失衡 ${imbalance.toFixed(2)} 倍`}
      >
        <div
          className="h-full rounded-l-full bg-bid transition-[width] duration-700 ease-out"
          style={{ width: `${bidPct}%` }}
        />
        <div
          className="h-full rounded-r-full bg-ask transition-[width] duration-700 ease-out"
          style={{ width: `${askPct}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] text-ink-faint">
        主导方向 · <span className="text-ink-dim">{dominant}</span> 侧订单流占优
      </p>
    </div>
  )
}
