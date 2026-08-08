import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AllocateModal } from './AllocateModal'
import { makeStrategy } from '../test/fixtures'

function setup(onSubmit = vi.fn().mockResolvedValue(true)) {
  const onClose = vi.fn()
  const strategy = makeStrategy({
    strategyId: 'strat_alloc',
    allocation: '10000',
    capitalCapacity: '50000',
  })

  render(
    <AllocateModal strategy={strategy} onClose={onClose} onSubmit={onSubmit} />,
  )

  return { onSubmit, onClose, strategy }
}

describe('AllocateModal', () => {
  it('strategy 为 null 时不渲染', () => {
    render(
      <AllocateModal strategy={null} onClose={vi.fn()} onSubmit={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('预填当前分配额度并展示容量上限', () => {
    setup()
    expect(screen.getByLabelText('New Allocation')).toHaveValue('10000')
    expect(screen.getByText(/资金容量上限 \$50,000/)).toBeInTheDocument()
  })

  it('拒绝超过资金容量的额度', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()

    const input = screen.getByLabelText('New Allocation')
    await user.clear(input)
    await user.type(input, '99999')
    await user.click(screen.getByRole('button', { name: /APPLY/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/不能超过资金容量/)).toBeInTheDocument()
  })

  it('拒绝非法金额', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()

    const input = screen.getByLabelText('New Allocation')
    await user.clear(input)
    await user.type(input, '-5')
    await user.click(screen.getByRole('button', { name: /APPLY/ }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('提交成功后关闭弹窗', async () => {
    const user = userEvent.setup()
    const { onSubmit, onClose } = setup()

    const input = screen.getByLabelText('New Allocation')
    await user.clear(input)
    await user.type(input, '20000')
    await user.click(screen.getByRole('button', { name: /APPLY/ }))

    expect(onSubmit).toHaveBeenCalledWith('strat_alloc', '20000')
    expect(onClose).toHaveBeenCalled()
  })

  it('提交失败时保持弹窗打开', async () => {
    const user = userEvent.setup()
    const { onClose } = setup(vi.fn().mockResolvedValue(false))

    await user.click(screen.getByRole('button', { name: /APPLY/ }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
