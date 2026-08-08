import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StrategyGrid } from './StrategyGrid'
import { makeStrategy } from '../test/fixtures'

const strategies = [
  makeStrategy({ strategyId: 'strat_a', name: 'Alpha', state: 'active' }),
  makeStrategy({ strategyId: 'strat_b', name: 'Bravo', state: 'paused' }),
  makeStrategy({
    strategyId: 'strat_c',
    name: 'Charlie',
    state: 'terminated',
    templateId: 'tpl_grid',
  }),
]

function setup(items = strategies, loading = false) {
  render(
    <StrategyGrid
      strategies={items}
      pendingIds={new Set()}
      loading={loading}
      onAction={vi.fn()}
      onAllocate={vi.fn()}
    />,
  )
}

describe('StrategyGrid 默认视图', () => {
  it('默认隐藏已终止策略，只展示还在跑的', () => {
    setup()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument()
  })

  it('提示有多少终止策略被隐藏', () => {
    setup()
    expect(screen.getByText(/1 个已终止策略已隐藏/)).toBeInTheDocument()
  })

  it('ALL 计数与实际可见条数一致', () => {
    setup()
    const group = screen.getByRole('group', { name: '按状态筛选' })
    expect(within(group).getByRole('button', { name: /^all/i })).toHaveTextContent(
      '2',
    )
  })

  it('没有终止策略时不显示隐藏提示', () => {
    setup(strategies.slice(0, 2))
    expect(screen.queryByText(/已终止策略已隐藏/)).not.toBeInTheDocument()
  })

  it('活跃策略排在暂停策略之前', () => {
    setup()
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((node) => node.textContent)).toEqual(['Alpha', 'Bravo'])
  })
})

describe('StrategyGrid 终止策略开关', () => {
  it('打开开关后展示终止策略并排在末尾', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /终止 1/ }))

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((node) => node.textContent)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ])
    expect(screen.queryByText(/已终止策略已隐藏/)).not.toBeInTheDocument()
  })

  it('提示里的「显示」链接同样能展开', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: '显示' }))
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('打开后 ALL 计数回到全量', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /终止 1/ }))

    const group = screen.getByRole('group', { name: '按状态筛选' })
    expect(within(group).getByRole('button', { name: /^all/i })).toHaveTextContent(
      '3',
    )
  })

  it('显式按 TERMINATED 筛选时无视开关，直接展示', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /terminated/i }))

    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('按 TERMINATED 筛选时开关被禁用，避免语义打架', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /terminated/i }))
    expect(screen.getByRole('button', { name: /终止 1/ })).toBeDisabled()
  })

  it('全部策略都已终止时给出针对性空态', () => {
    setup([strategies[2]])

    expect(screen.getByText('全部 1 个策略都已终止')).toBeInTheDocument()
    expect(screen.queryByText('沙箱中暂无策略')).not.toBeInTheDocument()
  })
})

describe('StrategyGrid 筛选与搜索', () => {

  it('按状态筛选', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /paused/i }))

    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('按名称搜索时能搜到已终止策略，不受默认隐藏影响', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByLabelText('搜索策略'), 'charlie')

    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText(/已终止策略已隐藏/)).not.toBeInTheDocument()
  })

  it('按模板 ID 搜索', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByLabelText('搜索策略'), 'tpl_grid')
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('清空搜索后重新隐藏终止策略', async () => {
    const user = userEvent.setup()
    setup()

    const input = screen.getByLabelText('搜索策略')
    await user.type(input, 'charlie')
    expect(screen.getByText('Charlie')).toBeInTheDocument()

    await user.clear(input)
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument()
  })

  it('筛选无结果时给出引导文案', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(screen.getByLabelText('搜索策略'), 'zzz-not-exist')
    expect(screen.getByText('没有匹配当前筛选条件的策略')).toBeInTheDocument()
  })

  it('列表为空时提示去创建策略', () => {
    setup([])
    expect(screen.getByText('沙箱中暂无策略')).toBeInTheDocument()
  })

  it('首屏加载中展示骨架屏而非空态', () => {
    setup([], true)
    expect(screen.queryByText('沙箱中暂无策略')).not.toBeInTheDocument()
  })
})
