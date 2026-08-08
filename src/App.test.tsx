import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeStrategy } from './test/fixtures'

const listMock = vi.fn()
const pauseMock = vi.fn()
const createMock = vi.fn()
const allocateMock = vi.fn()

vi.mock('./services/api', () => ({
  strategyApi: {
    list: (...args: unknown[]) => listMock(...args),
    findById: vi.fn(),
    pause: (...args: unknown[]) => pauseMock(...args),
    resume: vi.fn(),
    terminate: vi.fn(),
    create: (...args: unknown[]) => createMock(...args),
    allocate: (...args: unknown[]) => allocateMock(...args),
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

beforeEach(() => {
  listMock.mockReset()
  pauseMock.mockReset()
  createMock.mockReset()
  allocateMock.mockReset()
  listMock.mockResolvedValue({ strategies, skipped: 0 })
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
    expect(screen.getByText('Total Allocated Capital')).toBeInTheDocument()
    expect(screen.getByText('Estimated Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Max Drawdown Limit')).toBeInTheDocument()
  })

  it('核心指标由真实策略数据聚合而来', async () => {
    await renderApp()

    // 2 个策略中 1 个 active，总分配 30000 + 10000 = 40000
    expect(screen.getByText('/ 2')).toBeInTheDocument()

    const capitalCard = screen
      .getByText('Total Allocated Capital')
      .closest('article') as HTMLElement
    expect(within(capitalCard).getByText('$40.00K')).toBeInTheDocument()
    // 容量使用率 = 40000 / 100000
    expect(within(capitalCard).getByText(/40\.0%/)).toBeInTheDocument()
  })

  it('模拟指标带 SIM 标记，避免被误读为真实数据', async () => {
    await renderApp()
    expect(screen.getAllByText('SIM')).toHaveLength(2)
  })

  it('渲染权益曲线、策略网格与遥测面板', async () => {
    await renderApp()

    expect(screen.getByText('Equity Curve')).toBeInTheDocument()
    expect(screen.getByText('Strategy Grid & Control')).toBeInTheDocument()
    expect(screen.getByText('Neural Stream')).toBeInTheDocument()
    expect(screen.getByText('Telemetry Feed')).toBeInTheDocument()
    expect(screen.getByText('Alpha Momentum')).toBeInTheDocument()
  })

  it('底部注明哪些数据是模拟的', async () => {
    await renderApp()
    expect(
      screen.getByText(/权益曲线、胜率、回撤限制与信号流为前端模拟/),
    ).toBeInTheDocument()
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
