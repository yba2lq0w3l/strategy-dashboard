import { useCallback, useMemo, useState } from 'react'
import { LineChart, Radar, ScrollText, Layers } from 'lucide-react'
import { Header } from './components/Header'
import { PerformanceOverview } from './components/PerformanceOverview'
import { EquityChart } from './components/EquityChart'
import { ChartRangePicker } from './components/ChartRangePicker'
import { DEFAULT_CHART_RANGE } from './config/chartRanges'
import type { EquityRange } from './types/equity'
import { useEquityHistory } from './hooks/useEquityHistory'
import { StrategyGrid } from './components/StrategyGrid'
import { TelemetryPanel } from './components/telemetry/TelemetryPanel'
import { LogConsole } from './components/telemetry/LogConsole'
import { CreateStrategyModal } from './components/CreateStrategyModal'
import { LaunchTemplateModal } from './components/templates/LaunchTemplateModal'
import { useTemplates } from './hooks/useTemplates'
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
import type {
  CreateStrategyInput,
  Strategy,
  StrategyAction,
} from './types/strategy'

const DEFAULT_INTERVAL: RefreshInterval = REFRESH_INTERVALS[1].value
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
  const [templateOpen, setTemplateOpen] = useState(false)
  const [allocateTarget, setAllocateTarget] = useState<Strategy | null>(null)
  const [range, setRange] = useState<EquityRange>(DEFAULT_CHART_RANGE)

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
    summary,
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

  const handleEquityError = useCallback(
    (message: string) => {
      push('error', 'EQUITY', `权益曲线加载失败 · ${message}`)
    },
    [push],
  )

  const {
    series: equity,
    loading: equityLoading,
    refresh: refreshEquity,
  } = useEquityHistory({
    range,
    intervalMs: refreshInterval,
    onError: handleEquityError,
  })

  const templates = useTemplates(templateOpen)

  /** 模板启动成功后立刻刷新策略列表与净值曲线，不等下一个轮询周期。 */
  const handleLaunchTemplate = useCallback(
    async (input: CreateStrategyInput) => {
      const created = await createStrategy(input)
      await Promise.all([refresh(), refreshEquity()])
      return created
    },
    [createStrategy, refresh, refreshEquity],
  )

  const metrics = useMemo(
    () => computePortfolioMetrics(strategies),
    [strategies],
  )

  // Neural Stream 仍是前端合成的遥测，用策略状态派生种子保持稳定。
  const seed = useMemo(
    () => strategies.map((item) => `${item.strategyId}:${item.state}`).join('|'),
    [strategies],
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
        onLaunchTemplate={() => setTemplateOpen(true)}
      />

      <PerformanceOverview metrics={metrics} summary={summary} />

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel
            title="Equity Curve"
            subtitle="累计权益 · 来自 equity-history 接口"
            icon={<LineChart aria-hidden className="size-4" />}
            actions={<ChartRangePicker value={range} onChange={setRange} />}
            className="min-h-[320px]"
            glow
          >
            <EquityChart series={equity} loading={equityLoading} />
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
        策略、资金、状态、收益与权益曲线均实时来自 Staging 后端；右侧
        <span className="text-ink-dim"> Neural Stream 信号流为前端合成</span>
        （后端暂未提供订单簿与因子接口），仅作界面演示。
      </footer>

      <CreateStrategyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createStrategy}
      />

      <LaunchTemplateModal
        open={templateOpen}
        templates={templates.templates}
        loading={templates.loading}
        error={templates.error}
        onReload={() => void templates.reload()}
        onClose={() => setTemplateOpen(false)}
        onLaunch={handleLaunchTemplate}
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
