import { Radio } from 'lucide-react'
import type { TelemetrySnapshot } from '../../utils/telemetry'
import { FactorMeter } from './FactorMeter'
import { PressureGauge } from './PressureGauge'

interface TelemetryPanelProps {
  readonly telemetry: TelemetrySnapshot
  readonly activeCount: number
}

const IMBALANCE_SCALE = 2

export function TelemetryPanel({ telemetry, activeCount }: TelemetryPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <PressureGauge
        bidPressure={telemetry.bidPressure}
        askPressure={telemetry.askPressure}
        imbalance={telemetry.imbalance}
      />

      <div className="grid gap-3">
        <FactorMeter
          label="Conviction"
          value={telemetry.conviction}
          display={`${telemetry.conviction.toFixed(1)}%`}
          ratio={telemetry.conviction / 100}
        />
        <FactorMeter
          label="Edge Score"
          value={telemetry.edge}
          display={telemetry.edge.toFixed(0)}
          ratio={telemetry.edge / 100}
          tone="flux"
        />
        <FactorMeter
          label="Imbalance"
          value={telemetry.imbalance * 50}
          display={`${telemetry.imbalance.toFixed(2)}x`}
          ratio={telemetry.imbalance / IMBALANCE_SCALE}
          tone="flux"
        />
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-hairline/70 pt-3">
        <div>
          <dt className="label-caps">Latency</dt>
          <dd className="numeric text-xs text-ink">{telemetry.latencyMs}ms</dd>
        </div>
        <div>
          <dt className="label-caps">Signals</dt>
          <dd className="numeric text-xs text-ink">
            {telemetry.signalsPerMin}/min
          </dd>
        </div>
        <div>
          <dt className="label-caps">Live Agents</dt>
          <dd className="numeric flex items-center gap-1 text-xs text-ink">
            <Radio aria-hidden className="size-3 text-neon-soft" />
            {activeCount}
          </dd>
        </div>
      </dl>
    </div>
  )
}
