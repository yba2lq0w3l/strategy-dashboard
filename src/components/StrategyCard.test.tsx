import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StrategyCard } from './StrategyCard'
import { makeStrategy } from '../test/fixtures'

function setup(strategy = makeStrategy(), pending = false) {
  const onAction = vi.fn()
  const onAllocate = vi.fn()

  render(
    <StrategyCard
      strategy={strategy}
      pending={pending}
      onAction={onAction}
      onAllocate={onAllocate}
    />,
  )

  return { onAction, onAllocate }
}

describe('StrategyCard 展示', () => {
  it('渲染名称、状态与关键资金指标', () => {
    setup(makeStrategy({ name: 'Alpha Momentum' }))

    expect(screen.getByText('Alpha Momentum')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('paper')).toBeInTheDocument()
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    expect(screen.getByText('3.0x')).toBeInTheDocument()
  })

  it('展示容量使用率', () => {
    setup(makeStrategy({ allocation: '25000', capitalCapacity: '50000' }))
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('临近到期时给出提醒', () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString()
    setup(makeStrategy({ expiresAt: soon }))
    expect(screen.getByText(/天后到期/)).toBeInTheDocument()
  })
})

describe('StrategyCard 操作按钮', () => {
  it('active 状态下可暂停、不可恢复', () => {
    setup(makeStrategy({ state: 'active' }))

    expect(screen.getByRole('button', { name: /PAUSE/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /RESUME/ })).toBeDisabled()
  })

  it('paused 状态下可恢复、不可暂停', () => {
    setup(makeStrategy({ state: 'paused' }))

    expect(screen.getByRole('button', { name: /PAUSE/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /RESUME/ })).toBeEnabled()
  })

  it('paused 状态下禁用调整额度，避免注定 409 的请求', () => {
    setup(makeStrategy({ state: 'paused' }))
    expect(screen.getByRole('button', { name: /ALLOCATE/ })).toBeDisabled()
  })

  it('created 状态下同样禁用调整额度', () => {
    setup(makeStrategy({ state: 'created' }))
    expect(screen.getByRole('button', { name: /ALLOCATE/ })).toBeDisabled()
  })

  it('active 状态下可调整额度', () => {
    setup(makeStrategy({ state: 'active' }))
    expect(screen.getByRole('button', { name: /ALLOCATE/ })).toBeEnabled()
  })

  it('terminated 状态下所有控制按钮均禁用', () => {
    setup(makeStrategy({ state: 'terminated' }))

    expect(screen.getByRole('button', { name: /PAUSE/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /RESUME/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /TERMINATE/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /ALLOCATE/ })).toBeDisabled()
  })

  it('pending 时禁用操作，防止重复提交', () => {
    setup(makeStrategy({ state: 'active' }), true)
    expect(screen.getByRole('button', { name: /ALLOCATE/ })).toBeDisabled()
  })

  it('点击暂停回调携带策略 ID 与动作', async () => {
    const user = userEvent.setup()
    const { onAction } = setup(makeStrategy({ strategyId: 'strat_9' }))

    await user.click(screen.getByRole('button', { name: /PAUSE/ }))
    expect(onAction).toHaveBeenCalledWith('strat_9', 'pause')
  })

  it('终止需要二次确认', async () => {
    const user = userEvent.setup()
    const { onAction } = setup(makeStrategy({ strategyId: 'strat_9' }))

    await user.click(screen.getByRole('button', { name: /TERMINATE/ }))
    expect(onAction).not.toHaveBeenCalled()
    expect(screen.getByText('确认终止?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'YES' }))
    expect(onAction).toHaveBeenCalledWith('strat_9', 'terminate')
  })

  it('可以取消终止确认', async () => {
    const user = userEvent.setup()
    const { onAction } = setup()

    await user.click(screen.getByRole('button', { name: /TERMINATE/ }))
    await user.click(screen.getByRole('button', { name: 'NO' }))

    expect(onAction).not.toHaveBeenCalled()
    expect(screen.queryByText('确认终止?')).not.toBeInTheDocument()
  })

  it('点击 ALLOCATE 把整条策略回传给上层', async () => {
    const user = userEvent.setup()
    const strategy = makeStrategy()
    const { onAllocate } = setup(strategy)

    await user.click(screen.getByRole('button', { name: /ALLOCATE/ }))
    expect(onAllocate).toHaveBeenCalledWith(strategy)
  })
})
