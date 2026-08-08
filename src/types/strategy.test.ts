import { describe, expect, it } from 'vitest'
import { canAllocate, canRunAction } from './strategy'

describe('canRunAction', () => {
  it('仅 active 可暂停', () => {
    expect(canRunAction('active', 'pause')).toBe(true)
    expect(canRunAction('paused', 'pause')).toBe(false)
    expect(canRunAction('created', 'pause')).toBe(false)
    expect(canRunAction('terminated', 'pause')).toBe(false)
  })

  it('仅 paused 可恢复', () => {
    expect(canRunAction('paused', 'resume')).toBe(true)
    expect(canRunAction('active', 'resume')).toBe(false)
    expect(canRunAction('terminated', 'resume')).toBe(false)
  })

  it('除终止态外均可终止', () => {
    expect(canRunAction('active', 'terminate')).toBe(true)
    expect(canRunAction('paused', 'terminate')).toBe(true)
    expect(canRunAction('created', 'terminate')).toBe(true)
    expect(canRunAction('terminated', 'terminate')).toBe(false)
  })
})

describe('canAllocate', () => {
  it('仅 active 可调整额度，与上游 409 约束一致', () => {
    expect(canAllocate('active')).toBe(true)
    expect(canAllocate('paused')).toBe(false)
    expect(canAllocate('created')).toBe(false)
    expect(canAllocate('terminated')).toBe(false)
  })
})
