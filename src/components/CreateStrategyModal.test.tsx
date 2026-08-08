import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateStrategyModal } from './CreateStrategyModal'

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn()
  render(
    <CreateStrategyModal open onClose={onClose} onSubmit={onSubmit} />,
  )
  return { onSubmit, onClose }
}

describe('CreateStrategyModal', () => {
  it('关闭时不渲染任何内容', () => {
    render(
      <CreateStrategyModal
        open={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('展示默认表单值', () => {
    setup()
    expect(screen.getByLabelText('Template ID')).toHaveValue('tpl_demo')
    expect(screen.getByLabelText('Max Leverage')).toHaveValue('3')
    expect(screen.getByLabelText('Runtime Env')).toHaveValue('paper')
  })

  it('名称为空时阻止提交并提示', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()

    await user.click(screen.getByRole('button', { name: /DEPLOY/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('策略名称不能为空')).toBeInTheDocument()
  })

  it('拦截 "3x" 这类杠杆写法，避免上游 400', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()

    await user.type(screen.getByLabelText('Strategy Name'), 'Alpha')
    const leverage = screen.getByLabelText('Max Leverage')
    await user.clear(leverage)
    await user.type(leverage, '3x')
    await user.click(screen.getByRole('button', { name: /DEPLOY/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/纯数字/)).toBeInTheDocument()
  })

  it('校验通过后提交 snake_case 之前的领域输入并关闭弹窗', async () => {
    const user = userEvent.setup()
    const { onSubmit, onClose } = setup()

    await user.type(screen.getByLabelText('Strategy Name'), '  Alpha  ')
    await user.click(screen.getByRole('button', { name: /DEPLOY/ }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Alpha',
      templateId: 'tpl_demo',
      runtimeEnv: 'paper',
      allocation: '10000',
      capitalCapacity: '50000',
      strategyCapacity: '100000',
      maxLeverage: '3',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('提交失败时展示上游错误且不关闭弹窗', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('模板不存在'))
    const { onClose } = setup(onSubmit)

    await user.type(screen.getByLabelText('Strategy Name'), 'Alpha')
    await user.click(screen.getByRole('button', { name: /DEPLOY/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('模板不存在')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('选择 live 环境时给出真实资金提示', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(screen.getByLabelText('Runtime Env'), 'live')
    expect(screen.getByText(/真实资金环境/)).toBeInTheDocument()
  })

  it('按 Esc 关闭弹窗', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
