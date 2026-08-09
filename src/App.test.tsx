import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeStrategy } from './test/fixtures'

const listMock = vi.fn()
const pauseMock = vi.fn()
const createMock = vi.fn()
const allocateMock = vi.fn()
const equityMock = vi.fn()
const templatesMock = vi.fn()

vi.mock('./services/api', () => ({
  strategyApi: {
    list: (...args: unknown[]) => listMock(...args),
    findById: vi.fn(),
    pause: (...args: unknown[]) => pauseMock(...args),
    resume: vi.fn(),
    terminate: vi.fn(),
    create: (...args: unknown[]) => createMock(...args),
    allocate: (...args: unknown[]) => allocateMock(...args),
    equityHistory: (...args: unknown[]) => equityMock(...args),
    listTemplates: (...args: unknown[]) => templatesMock(...args),
  },
}))

// jsdom 下 ResponsiveContainer 量到的尺寸为 0，固定尺寸后图表才会真正渲染。
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={900} height={320}>
        {children}
      </actual.ResponsiveContainer>
    ),
  }
})

const strategies = [
  makeStrategy({
    strategyId: 'strat_a',
    name: 'Alpha Momentum',
    state: 'active',
    allocation: '30000',
    capitalCapacity: '60000',
  }),
  makeStrategy({
    strategyId: 'strat_b',
    name: 'Bravo Arb',
    state: 'paused',
    allocation: '10000',
    capitalCapacity: '40000',
    runtimeEnv: 'live',
  }),
]

const summary = {
  totalPnl: 805.5,
  totalPnlPct: 3.66,
  winRatePct: 66.6,
  maxDrawdownPct: 12.5,
}

const equitySeries = {
  points: [
    { timestamp: 1_800_000_000_000, equity: 22_000, pnl: 0, drawdownPct: 0 },
    { timestamp: 1_800_000_300_000, equity: 22_805, pnl: 805, drawdownPct: 1.61 },
  ],
  summary: {
    baseEquity: 22_000,
    finalEquity: 22_805,
    totalPnl: 805,
    totalPnlPct: 3.66,
    maxDrawdownPct: 1.61,
  },
}

beforeEach(() => {
  listMock.mockReset()
  pauseMock.mockReset()
  createMock.mockReset()
  allocateMock.mockReset()
  equityMock.mockReset()
  templatesMock.mockReset()
  listMock.mockResolvedValue({ strategies, summary, skipped: 0 })
  equityMock.mockResolvedValue(equitySeries)
  templatesMock.mockResolvedValue({
    templates: [
      {
        templateId: 'grid_trading_v1',
        name: '网格交易',
        description: '在设定价格区间内等分挂单。',
        recommendedLeverage: '2',
        defaultAllocation: '1000',
        riskLevel: 'MEDIUM',
        params: [],
      },
    ],
    skipped: 0,
  })
})

async function renderApp() {
  render(<App />)
  await waitFor(() =>
    expect(screen.getByText(/ONLINE · STAGING CONNECTED/)).toBeInTheDocument(),
  )
}

describe('App 大屏首屏', () => {
  it('渲染连接状态与四个核心指标卡', async () => {
    await renderApp()

    expect(screen.getByText('Active Strategies')).toBeInTheDocument()
    expect(screen.getByText('Total PnL')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
  })

  it('活跃策略数由真实策略列表聚合而来', async () => {
    await renderApp()
    expect(screen.getByText('/ 2')).toBeInTheDocument()
  })

  it('收益指标来自后端 summary，不再是模拟值', async () => {
    await renderApp()

    // 紧凑格式在 100~1000 区间不带小数，805.5 → $806
    const pnlCard = screen.getByText('Total PnL').closest('article') as HTMLElement
    expect(within(pnlCard).getByText('$806')).toBeInTheDocument()
    expect(within(pnlCard).getByText(/收益率 \+3\.66%/)).toBeInTheDocument()

    const winCard = screen.getByText('Win Rate').closest('article') as HTMLElement
    expect(within(winCard).getByText('66.6')).toBeInTheDocument()

    const ddCard = screen
      .getByText('Max Drawdown')
      .closest('article') as HTMLElement
    expect(within(ddCard).getByText('12.50')).toBeInTheDocument()
  })

  it('不再出现任何 SIM 角标', async () => {
    await renderApp()
    expect(screen.queryByText('SIM')).not.toBeInTheDocument()
  })

  it('summary 缺失时指标显示占位符而不是 0', async () => {
    listMock.mockResolvedValue({ strategies, summary: null, skipped: 0 })
    await renderApp()

    const pnlCard = screen.getByText('Total PnL').closest('article') as HTMLElement
    expect(within(pnlCard).getByText('—')).toBeInTheDocument()
    expect(within(pnlCard).getByText(/暂无收益数据/)).toBeInTheDocument()
  })

  it('渲染权益曲线、策略网格与遥测面板', async () => {
    await renderApp()

    expect(screen.getByText('Equity Curve')).toBeInTheDocument()
    expect(screen.getByText('Strategy Grid & Control')).toBeInTheDocument()
    expect(screen.getByText('Neural Stream')).toBeInTheDocument()
    expect(screen.getByText('Telemetry Feed')).toBeInTheDocument()
    expect(screen.getByText('Alpha Momentum')).toBeInTheDocument()
  })

  it('页脚只把 Neural Stream 标为前端合成', async () => {
    await renderApp()

    expect(
      screen.getByText(/Neural Stream 信号流为前端合成/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/权益曲线、胜率、回撤限制与信号流为前端模拟/))
      .not.toBeInTheDocument()
  })
})

describe('App 权益曲线', () => {
  it('用默认窗口 6h 拉取曲线并渲染真实汇总', async () => {
    await renderApp()

    expect(equityMock).toHaveBeenCalledWith('6h')
    expect(screen.getByText('$22,805')).toBeInTheDocument()
    expect(screen.getByText('+3.66%')).toBeInTheDocument()
  })

  it('曲线为空时渲染空态而不是画一条贴地假线', async () => {
    equityMock.mockResolvedValue({ points: [], summary: null })
    await renderApp()

    expect(
      await screen.findByText('当前时间窗口内暂无净值数据'),
    ).toBeInTheDocument()
  })

  it('切换时间窗口用后端接受的取值重新拉取', async () => {
    const user = userEvent.setup()
    await renderApp()

    const picker = screen.getByRole('group', { name: '图表时间范围' })
    await user.click(within(picker).getByRole('button', { name: '24H' }))

    await waitFor(() => expect(equityMock).toHaveBeenCalledWith('24h'))
  })

  it('曲线接口失败时写入控制台日志且不影响策略网格', async () => {
    equityMock.mockRejectedValue(new Error('上游超时'))
    await renderApp()

    await waitFor(() =>
      expect(screen.getAllByText(/权益曲线加载失败/).length).toBeGreaterThan(0),
    )
    expect(screen.getByText('Alpha Momentum')).toBeInTheDocument()
  })
})

describe('App 模板一键启动', () => {
  it('打开模板弹窗时才拉取模板目录', async () => {
    const user = userEvent.setup()
    await renderApp()

    expect(templatesMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /FROM TEMPLATE/ }))
    await waitFor(() => expect(templatesMock).toHaveBeenCalled())
    expect(
      await screen.findByRole('button', { name: /网格交易/ }),
    ).toBeInTheDocument()
  })

  it('一键启动后自动刷新策略列表与净值曲线', async () => {
    const user = userEvent.setup()
    createMock.mockResolvedValue(
      makeStrategy({ strategyId: 'strat_tpl', name: '网格交易' }),
    )
    await renderApp()

    await user.click(screen.getByRole('button', { name: /FROM TEMPLATE/ }))
    await user.click(await screen.findByRole('button', { name: /网格交易/ }))

    listMock.mockClear()
    equityMock.mockClear()
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(createMock).toHaveBeenCalled())
    // 需求要求创建成功后同时刷新列表与曲线，不等下一个轮询周期
    await waitFor(() => expect(listMock).toHaveBeenCalled())
    await waitFor(() => expect(equityMock).toHaveBeenCalled())
  })

  it('提交给后端的止盈止损是 0~1 比例而不是百分比', async () => {
    const user = userEvent.setup()
    createMock.mockResolvedValue(makeStrategy({ strategyId: 'strat_tpl' }))
    await renderApp()

    await user.click(screen.getByRole('button', { name: /FROM TEMPLATE/ }))
    await user.click(await screen.findByRole('button', { name: /网格交易/ }))
    await user.click(screen.getByRole('button', { name: /一键启动策略/ }))

    await waitFor(() => expect(createMock).toHaveBeenCalled())
    expect(createMock.mock.calls[0][0]).toMatchObject({
      templateId: 'grid_trading_v1',
      takeProfitPct: '0.1',
      stopLossPct: '0.05',
    })
  })
})

describe('App 交互', () => {
  it('手动刷新会重新拉取列表', async () => {
    const user = userEvent.setup()
    await renderApp()
    listMock.mockClear()

    await user.click(screen.getByRole('button', { name: '立即刷新' }))
    await waitFor(() => expect(listMock).toHaveBeenCalled())
  })

  it('切换自动刷新档位', async () => {
    const user = userEvent.setup()
    await renderApp()

    const toggle = screen.getByRole('group', { name: '自动刷新间隔' })
    await user.click(within(toggle).getByRole('button', { name: '2s' }))

    expect(within(toggle).getByRole('button', { name: '2s' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('切换图表时间范围', async () => {
    const user = userEvent.setup()
    await renderApp()

    const picker = screen.getByRole('group', { name: '图表时间范围' })
    await user.click(within(picker).getByRole('button', { name: '24H' }))

    expect(within(picker).getByRole('button', { name: '24H' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('打开并关闭新建策略弹窗', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: /NEW STRATEGY/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('暂停策略后写入日志并弹出提示', async () => {
    const user = userEvent.setup()
    pauseMock.mockResolvedValue({ ...strategies[0], state: 'paused' })
    await renderApp()

    const card = screen.getByText('Alpha Momentum').closest('article')
    expect(card).not.toBeNull()

    await user.click(within(card as HTMLElement).getByRole('button', { name: /PAUSE/ }))

    await waitFor(() =>
      expect(screen.getAllByText(/暂停成功/).length).toBeGreaterThan(0),
    )
  })

  it('通过 ALLOCATE 弹窗调整资金', async () => {
    const user = userEvent.setup()
    allocateMock.mockResolvedValue({ ...strategies[0], allocation: '35000' })
    await renderApp()

    const card = screen.getByText('Alpha Momentum').closest('article')
    await user.click(
      within(card as HTMLElement).getByRole('button', { name: /ALLOCATE/ }),
    )

    const input = screen.getByLabelText('New Allocation')
    await user.clear(input)
    await user.type(input, '35000')
    await user.click(screen.getByRole('button', { name: /APPLY/ }))

    await waitFor(() => expect(allocateMock).toHaveBeenCalledWith('strat_a', '35000'))
  })

  it('上游不可达时展示离线状态', async () => {
    listMock.mockRejectedValue(new Error('连接失败'))
    render(<App />)

    await waitFor(() =>
      expect(screen.getByText(/OFFLINE · UPSTREAM UNREACHABLE/)).toBeInTheDocument(),
    )
  })
})

describe('App 遥测流', () => {
  it('随时间推进向控制台注入信号日志', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<App />)
      await waitFor(() =>
        expect(screen.getByText('Telemetry Feed')).toBeInTheDocument(),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000)
      })

      const feed = screen.getByRole('log', { name: '实时运行日志' })
      expect(within(feed).getAllByRole('listitem').length).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
