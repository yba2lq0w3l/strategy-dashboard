import { useMemo, useState } from 'react'
import { Eye, EyeOff, Inbox, Search } from 'lucide-react'
import type { Strategy, StrategyAction, StrategyState } from '../types/strategy'
import { STRATEGY_STATES } from '../types/strategy'
import { StrategyCard } from './StrategyCard'

interface StrategyGridProps {
  readonly strategies: readonly Strategy[]
  readonly pendingIds: ReadonlySet<string>
  readonly loading: boolean
  readonly onAction: (strategyId: string, action: StrategyAction) => void
  readonly onAllocate: (strategy: Strategy) => void
}

type StateFilter = StrategyState | 'all'

const STATE_FILTERS: readonly StateFilter[] = ['all', ...STRATEGY_STATES]

function matchesQuery(strategy: Strategy, query: string): boolean {
  if (query.length === 0) return true
  const needle = query.toLowerCase()
  return (
    strategy.name.toLowerCase().includes(needle) ||
    strategy.strategyId.toLowerCase().includes(needle) ||
    (strategy.templateId ?? '').toLowerCase().includes(needle)
  )
}

/** 活跃优先、终止置底，同组内按分配额度降序，保证大屏视线聚焦在运行中的策略。 */
const STATE_WEIGHT: Record<StrategyState, number> = {
  active: 0,
  paused: 1,
  created: 2,
  terminated: 3,
}

function SkeletonCard() {
  return (
    <div className="panel h-52 animate-pulse p-4">
      <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
      <div className="mt-3 h-3 w-1/2 rounded bg-white/[0.04]" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-6 rounded bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}

export function StrategyGrid({
  strategies,
  pendingIds,
  loading,
  onAction,
  onAllocate,
}: StrategyGridProps) {
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  const [query, setQuery] = useState('')
  // 策略已持久化到数据库，终止态会长期累积。默认从 ALL 视图里收起，
  // 让大屏聚焦在还在跑的策略上；需要复盘时用开关或 TERMINATED 筛选调出来。
  const [showTerminated, setShowTerminated] = useState(false)

  const terminatedCount = useMemo(
    () => strategies.filter((item) => item.state === 'terminated').length,
    [strategies],
  )

  /**
   * ALL 视图是否隐藏了终止策略。两种情况以更明确的意图为准：
   * 显式选中 TERMINATED 筛选、或正在搜索时，都不再隐藏
   * （用户输入了具体名称就是想找它，搜不到会更困惑）。
   */
  const hidingTerminated =
    stateFilter === 'all' &&
    !showTerminated &&
    terminatedCount > 0 &&
    query.trim().length === 0

  const visible = useMemo(() => {
    const needle = query.trim()

    return strategies
      .filter((item) => {
        if (!matchesQuery(item, needle)) return false
        if (stateFilter !== 'all') return item.state === stateFilter
        if (needle.length > 0) return true
        return showTerminated || item.state !== 'terminated'
      })
      .toSorted((a, b) => {
        const byState = STATE_WEIGHT[a.state] - STATE_WEIGHT[b.state]
        if (byState !== 0) return byState
        return Number(b.allocation) - Number(a.allocation)
      })
  }, [strategies, stateFilter, query, showTerminated])

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.03] p-1"
          role="group"
          aria-label="按状态筛选"
        >
          {STATE_FILTERS.map((filter) => {
            const selected = filter === stateFilter
            // ALL 的计数要与实际可见条数一致，否则「ALL 3 却只有 2 张卡」会让人以为丢数据。
            const count =
              filter === 'all'
                ? strategies.length - (hidingTerminated ? terminatedCount : 0)
                : strategies.filter((item) => item.state === filter).length
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={selected}
                onClick={() => setStateFilter(filter)}
                className={`h-6 rounded px-2 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                  selected
                    ? 'bg-flux/20 text-flux-soft'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                {filter} <span className="numeric opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-pressed={showTerminated}
          disabled={stateFilter === 'terminated'}
          onClick={() => setShowTerminated((prev) => !prev)}
          title={
            stateFilter === 'terminated'
              ? '当前已按 TERMINATED 筛选，开关不生效'
              : '控制 ALL 视图是否包含已终止策略'
          }
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[10px] tracking-wider uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            showTerminated
              ? 'border-flux/45 bg-flux/15 text-flux-soft'
              : 'border-hairline bg-white/[0.03] text-ink-faint hover:text-ink'
          }`}
        >
          {showTerminated ? (
            <Eye aria-hidden className="size-3.5" />
          ) : (
            <EyeOff aria-hidden className="size-3.5" />
          )}
          终止 <span className="numeric opacity-70">{terminatedCount}</span>
        </button>

        <label className="relative ml-auto">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称 / ID / 模板"
            aria-label="搜索策略"
            className="h-8 w-56 rounded-lg border border-hairline bg-white/[0.03] pr-3 pl-8 font-mono text-[11px] text-ink placeholder:text-ink-faint focus:border-flux/60 focus:outline-none"
          />
        </label>
      </div>

      {loading && strategies.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline py-14 text-center">
          <Inbox aria-hidden className="size-7 text-ink-faint" />
          <p className="text-sm text-ink-dim">
            {strategies.length === 0
              ? '沙箱中暂无策略'
              : hidingTerminated
                ? `全部 ${terminatedCount} 个策略都已终止`
                : '没有匹配当前筛选条件的策略'}
          </p>
          <p className="text-[11px] text-ink-faint">
            {strategies.length === 0
              ? '点击右上角 NEW STRATEGY 部署第一个智能体策略'
              : hidingTerminated
                ? '点击「终止」开关查看它们，或部署新策略'
                : '试试清空搜索或切换状态筛选'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {visible.map((strategy) => (
              <StrategyCard
                key={strategy.strategyId}
                strategy={strategy}
                pending={pendingIds.has(strategy.strategyId)}
                onAction={onAction}
                onAllocate={onAllocate}
              />
            ))}
          </div>

          {hidingTerminated && (
            <p className="text-center text-[11px] text-ink-faint">
              {terminatedCount} 个已终止策略已隐藏
              <button
                type="button"
                onClick={() => setShowTerminated(true)}
                className="ml-1.5 text-flux-soft underline-offset-2 hover:underline"
              >
                显示
              </button>
            </p>
          )}
        </>
      )}
    </div>
  )
}
