import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LogConsole } from './LogConsole'
import { createLogEntry, type LogEntry } from '../../utils/telemetry'

const logs: readonly LogEntry[] = [
  createLogEntry('success', 'CONTROL', '暂停成功', 1_700_000_000_000),
  createLogEntry('error', 'SYNC', '连接失败', 1_700_000_001_000),
]

describe('LogConsole', () => {
  it('空列表时展示等待文案', () => {
    render(<LogConsole logs={[]} />)
    expect(screen.getByText('等待信号流接入…')).toBeInTheDocument()
  })

  it('渲染日志内容、来源与级别标签', () => {
    render(<LogConsole logs={logs} />)

    expect(screen.getByText('暂停成功')).toBeInTheDocument()
    expect(screen.getByText('[CONTROL]')).toBeInTheDocument()
    expect(screen.getByText('ERR')).toBeInTheDocument()
  })

  it('手动上滚后暂停自动跟随并给出返回入口', async () => {
    const user = userEvent.setup()
    render(<LogConsole logs={logs} />)

    const region = screen.getByRole('log', { name: '实时运行日志' })
    Object.defineProperty(region, 'scrollTop', { value: 200, writable: true })
    fireEvent.scroll(region)

    const backButton = await screen.findByRole('button', { name: /回到最新/ })
    await user.click(backButton)

    expect(screen.queryByRole('button', { name: /回到最新/ })).not.toBeInTheDocument()
  })
})
