import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom 未实现 ResizeObserver，Recharts 的 ResponsiveContainer 依赖它。
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom 也没有实现滚动相关 API，日志控制台的自动跟随会用到。
Element.prototype.scrollTo ??= function scrollTo(): void {}
