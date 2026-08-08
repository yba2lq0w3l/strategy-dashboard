import { useCallback, useMemo, useState } from 'react'
import { LineChart, Radar, ScrollText, Layers } from 'lucide-react'
import { Header } from './components/Header'
import { PerformanceOverview } from './components/PerformanceOverview'
import { EquityChart } from './components/EquityChart'
import { ChartRangePicker } from './components/ChartRangePicker'
import { CHART_RANGES, type ChartRange } from './config/chartRanges'
import { StrategyGrid } from './components/StrategyGrid'
import { TelemetryPanel } from './components/telemetry/TelemetryPanel'
import { LogConsole } from './components/telemetry/LogConsole'
import { CreateStrategyModal } from './components/CreateStrategyModal'
import { AllocateModal } from './components/AllocateModal'
import { ToastStack } from './components/ToastStack'
import { Panel } from './components/ui/Panel'
import { Button } from './components/ui/Button'
import { REFRESH_INTERVALS, type RefreshInterval } from './config/env'
import { useStrategies, type StrategyEvent } from './hooks/useStrategies'
import { useConsoleLog } from './hooks/useConsoleLog'
import { useTelemetry } from './hooks/useTelemetry'
import { useToasts, type ToastTone } from './hooks/useToasts'
import { useNow } from './hooks/useNow'
import { activeRatio, computePortfolioMetrics } from './utils/metrics'
import { buildEquitySeries } from './utils/equity'
import type { Strategy, StrategyAction } from './types/strategy'

const DEFAULT_INTERVAL: RefreshInterval = REFRESH_INTERVALS[1].value
const FALLBACK_BASE_CAPITAL = 100_000
const CLOCK_TICK_MS = 1_000

const EVENT_TONE: Record<StrategyEvent['level'], ToastTone> = {
  info: 'info',
  success: 'success',
  warn: 'warn',
  error: 'error',
}

export default function App() {
  const [refreshInterval, setRefreshInterval] =
    useState<RefreshInterval>(DEFAULT_INTERVAL)
  const [createOpen, setCreateOpen] = useState(false)
  const [allocateTarget, setAllocateTarget] = useState<Strategy | null>(null)
  const [range, setRange] = useState<ChartRange>(CHART_RANGES[1])

  const now = useNow(CLOCK_TICK_MS)
  const { logs, push, pushEntry, clear } = useConsoleLog()
  const { toasts, notify, dismiss } = useToasts()

  // 数据层事件同时进入控制台日志与右下角轻提示。
  const handleEvent = useCallback(
    (event: StrategyEvent) => {
      push(event.level, event.source, event.message)
      if (event.level !== 'info') {
        notify(EVENT_TONE[event.level], event.message)
      }
    },
    [notify, push],
  )

  const {
    strategies,
    status,
    error,
    lastSyncAt,
    isRefreshing,
    pendingIds,
    refresh,
    runAction,
    createStrategy,
    allocate,
  } = useStrategies({ intervalMs: refreshInterval, onEvent: handleEvent })

  const metrics = useMemo(
    () => computePortfolioMetrics(strategies),
    [strategies],
  )

  const seed = useMemo(
    () => strategies.map((item) => `${item.strategyId}:${item.state}`).join('|'),
    [strategies],
  )

  // 曲线终点对齐到当前时间片，避免每秒重算导致的视觉抖动。
  const alignedEnd = Math.floor(now / range.intervalMs) * range.intervalMs

  const equity = useMemo(
    () =>
      buildEquitySeries({
        seed: seed || 'idle',
        baseCapital: metrics.totalAllocated || FALLBACK_BASE_CAPITAL,
        points: range.points,
        intervalMs: range.intervalMs,
        endTime: alignedEnd,
        // 杠杆越高，模拟出的波动越大。
        volatility: 0.003 * (1 + metrics.avgLeverage / 5),
        drift: 0.0009 * (metrics.activeCount > 0 ? 1 : 0.15),
      }),
    [seed, metrics, range, alignedEnd],
  )

  const telemetry = useTelemetry({
    seed: seed || 'idle',
    strategies,
    activeRatio: activeRatio(metrics),
    enabled: true,
    onSignal: pushEntry,
  })

  const handleAction = useCallback(
    (strategyId: string, action: StrategyAction) => {
      void runAction(strategyId, action)
    },
    [runAction],
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-3 p-3 sm:p-4">
      <Header
        status={status}
        lastSyncAt={lastSyncAt}
        now={now}
        error={error}
        interval={refreshInterval}
        isRefreshing={isRefreshing}
        onIntervalChange={setRefreshInterval}
        onRefresh={() => void refresh()}
        onCreate={() => setCreateOpen(true)}
      />

      <PerformanceOverview
        metrics={metrics}
        currentDrawdownPct={equity.maxDrawdownPct}
      />

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel
            title="Equity Curve"
            subtitle="累计权益 · 模拟数据（后端暂无 PnL 接口）"
            icon={<LineChart aria-hidden className="size-4" />}
            actions={<ChartRangePicker value={range} onChange={setRange} />}
            className="min-h-[320px]"
            glow
          >
            <EquityChart series={equity} />
          </Panel>

          <Panel
            title="Strategy Grid & Control"
            subtitle={`${metrics.total} 个策略 · ${metrics.activeCount} 运行中`}
            icon={<Layers aria-hidden className="size-4" />}
            bodyClassName="overflow-y-auto"
          >
            <StrategyGrid
              strategies={strategies}
              pendingIds={pendingIds}
              loading={status === 'connecting'}
              onAction={handleAction}
              onAllocate={setAllocateTarget}
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Panel
            title="Neural Stream"
            subtitle="买卖压力与因子读数 · 模拟"
            icon={<Radar aria-hidden className="size-4" />}
          >
            <TelemetryPanel
              telemetry={telemetry}
              activeCount={metrics.activeCount}
            />
          </Panel>

          <Panel
            title="Telemetry Feed"
            subtitle={`${logs.length} 条记录`}
            icon={<ScrollText aria-hidden className="size-4" />}
            className="min-h-[280px] xl:flex-1"
            bodyClassName="min-h-0"
            actions={
              <Button size="sm" variant="ghost" onClick={clear}>
                CLEAR
              </Button>
            }
          >
            <LogConsole logs={logs} />
          </Panel>
        </div>
      </div>

      <footer className="px-1 pb-1 text-[10px] leading-relaxed text-ink-faint">
        策略、资金与状态数据实时来自 Staging 后端；
        <span className="text-ink-dim">
          权益曲线、胜率、回撤限制与信号流为前端模拟
        </span>
        （后端尚未提供对应接口），仅用于界面演示，不代表真实成交结果。
      </footer>

      <CreateStrategyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createStrategy}
      />

      <AllocateModal
        strategy={allocateTarget}
        onClose={() => setAllocateTarget(null)}
        onSubmit={allocate}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
