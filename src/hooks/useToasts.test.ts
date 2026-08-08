import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToasts } from './useToasts'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToasts', () => {
  it('新提示排在最前', () => {
    const { result } = renderHook(() => useToasts())

    act(() => {
      result.current.notify('info', '第一条')
      result.current.notify('error', '第二条')
    })

    expect(result.current.toasts[0].message).toBe('第二条')
    expect(result.current.toasts).toHaveLength(2)
  })

  it('最多保留 4 条', () => {
    const { result } = renderHook(() => useToasts())

    act(() => {
      for (let i = 0; i < 8; i += 1) result.current.notify('info', `msg-${i}`)
    })

    expect(result.current.toasts).toHaveLength(4)
  })

  it('超时后自动消失', () => {
    const { result } = renderHook(() => useToasts())

    act(() => {
      result.current.notify('success', '完成')
    })
    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('可以手动关闭', () => {
    const { result } = renderHook(() => useToasts())

    act(() => {
      result.current.notify('warn', '注意')
    })
    const id = result.current.toasts[0].id

    act(() => {
      result.current.dismiss(id)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('卸载时清理所有定时器', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { result, unmount } = renderHook(() => useToasts())

    act(() => {
      result.current.notify('info', 'a')
      result.current.notify('info', 'b')
    })

    unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
