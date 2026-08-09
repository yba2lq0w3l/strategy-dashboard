import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LaunchTemplateModal } from './LaunchTemplateModal'
import type { StrategyTemplate } from '../../types/template'

const gridTemplate: StrategyTemplate = {
  templateId: 'grid_trading_v1',
  name: '网格交易',
  description: '在设定价格区间内等分挂单。',
  recommendedLeverage: '2',
  defaultAllocation: '1000',
  riskLevel: 'MEDIUM',
  params: [
    {
      name: 'grid_count',
      type: 'integer',
      description: '网格数量',
      required: true,
      minimum: 2,
      maximum: 200,
    },
  ],
}

const dcaTemplate: StrategyTemplate = {
  templateId: 'dca_accumulator_v1',
  name: 'DCA 定投',
  description: '按固定周期分批买入摊平成本。',
  recommendedLeverage: '1',
  defaultAllocation: '500',
  riskLevel: 'LOW',
  params: [],
}

function setup(overrides: Partial<Parameters<typeof LaunchTemplateModal>[0]> = {}) {
  const onLaunch = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  const onReload = vi.fn()

  render(
    <LaunchTemplateModal
      open
      templates={[gridTemplate, dcaTemplate]}
      loading={false}
      error={null}
      onReload={onReload}
      onClose={onClose}
      onLaunch={onLaunch}
      {...overrides}
    />,
  )

  return { onLaunch, onClose, onReload }
}

async function pickGrid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /网格交易/ }))
}

describe('LaunchTemplateModal 模板选择', () => {
  it('展示全部模板及其风险等级与推荐参数', () => {
    setup()

    expect(screen.getByRole('button', { name: /网格交易/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /DCA 定投/ })).toBeInTheDocument()
    expect(screen.getByText('中风险')).toBeInTheDocument()
    expect(screen.getByText('低风险')).toBeInTheDocument()
    expect(screen.getByText('2.0x')).toBeInTheDocument()
  })

  it('加载中展示占位而不是空列表', () => {
    setup({ templates: [], loading: true })
    expect(screen.getByText('正在加载官方模板…')).toBeInTheDocument()
  })

  it('加载失败提供重试入口', async () => {
    const user = userEvent.setup()
    const { onReload } = setup({ templates: [], error: '上游超时' })

    expect(screen.getByText('模板加载失败')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /重试/ }))
    expect(onReload).toHaveBeenCalled()
  })

  it('选中模板后进入配置表单并预填模板默认值', async () => {
    const user = userEvent.setup()
    setup()
    await pickGrid(user)

    expect(screen.getByLabelText('Strategy Name')).toHaveValue('网格交易')
    expect(screen.getByLabelText('授权额度 (Allocation)')).toHaveValue('1000')
  })

  it('可从配置表单返回重新选择', async () => {
    const user = userEvent.setup()
    setup()
    await pickGrid(user)

    await user.click(screen.getByRole('button', { name: /返回选择/ }))
    expect(screen.getByRole('button', { name: /DCA 定投/ })).toBeInTheDocument()
  })

  it('展示模板参数说明及其不可配置的提示', async () => {
    const user = userEvent.setup()
    setup()
    await pickGrid(user)

    expect(screen.getByText('grid_count')).toBeInTheDocument()
    expect(screen.getByText(/将使用模板默认值/)).toBeInTheDocument()
  })
})

describe('LaunchTemplateModal 一键启动', () => {
  it('把百分比输入转换成上游要求的 0~1 比例', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    // 表单默认止盈 10%、止损 5%
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(onLaunch).toHaveBeenCalled())
    expect(onLaunch.mock.calls[0][0]).toMatchObject({
      takeProfitPct: '0.1',
      stopLossPct: '0.05',
    })
  })

  it('授权额度同时作为资金容量与策略容量', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    const allocation = screen.getByLabelText('授权额度 (Allocation)')
    await user.clear(allocation)
    await user.type(allocation, '500')
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(onLaunch).toHaveBeenCalled())
    expect(onLaunch.mock.calls[0][0]).toMatchObject({
      allocation: '500',
      capitalCapacity: '500',
      strategyCapacity: '500',
      templateId: 'grid_trading_v1',
      maxLeverage: '2',
      runtimeEnv: 'paper',
    })
  })

  it('解析逗号分隔的资产对并去重大写', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    await user.type(
      screen.getByLabelText('允许资产对 (Allowed Assets)'),
      'btc-usdt, ETH-USDT, btc-usdt',
    )
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(onLaunch).toHaveBeenCalled())
    expect(onLaunch.mock.calls[0][0].allowedAssets).toEqual([
      'BTC-USDT',
      'ETH-USDT',
    ])
  })

  it('止盈止损留空则不提交该字段', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    await user.clear(screen.getByLabelText('止盈比例 (%)'))
    await user.clear(screen.getByLabelText('止损比例 (%)'))
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(onLaunch).toHaveBeenCalled())
    const payload = onLaunch.mock.calls[0][0]
    expect(payload).not.toHaveProperty('takeProfitPct')
    expect(payload).not.toHaveProperty('stopLossPct')
  })

  it('拦截超出上限的止损，后端对此不做校验', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    const sl = screen.getByLabelText('止损比例 (%)')
    await user.clear(sl)
    await user.type(sl, '150')
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    expect(onLaunch).not.toHaveBeenCalled()
    expect(screen.getByText(/不能超过 100%/)).toBeInTheDocument()
  })

  it('拒绝非法额度', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    const allocation = screen.getByLabelText('授权额度 (Allocation)')
    await user.clear(allocation)
    await user.type(allocation, '0')
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    expect(onLaunch).not.toHaveBeenCalled()
    expect(screen.getByText(/授权额度必须大于 0/)).toBeInTheDocument()
  })

  it('拒绝格式非法的资产对', async () => {
    const user = userEvent.setup()
    const { onLaunch } = setup()
    await pickGrid(user)

    await user.type(
      screen.getByLabelText('允许资产对 (Allowed Assets)'),
      'BTC/USDT!!',
    )
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    expect(onLaunch).not.toHaveBeenCalled()
    expect(screen.getByText(/资产对格式非法/)).toBeInTheDocument()
  })

  it('启动成功后关闭弹窗', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await pickGrid(user)

    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('启动失败时展示错误且不关闭弹窗', async () => {
    const user = userEvent.setup()
    const onLaunch = vi.fn().mockRejectedValue(new Error('模板不可用'))
    const { onClose } = setup({ onLaunch })
    await pickGrid(user)

    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('模板不可用')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('选择 live 环境时给出真实资金提示', async () => {
    const user = userEvent.setup()
    setup()
    await pickGrid(user)

    await user.selectOptions(screen.getByLabelText('Runtime Env'), 'live')
    expect(screen.getByText(/真实资金环境/)).toBeInTheDocument()
  })
})
