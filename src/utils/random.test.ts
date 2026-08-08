import { describe, expect, it } from 'vitest'
import { createRandom, gaussian, hashSeed, pick } from './random'

describe('hashSeed', () => {
  it('同输入同输出，不同输入不同输出', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
  })

  it('返回 32 位无符号整数', () => {
    const value = hashSeed('some-strategy-id')
    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(2 ** 32)
  })
})

describe('createRandom', () => {
  it('产出 [0,1) 区间的值', () => {
    const random = createRandom(42)
    for (let i = 0; i < 200; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('同种子产生相同序列', () => {
    const a = createRandom(7)
    const b = createRandom(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('gaussian', () => {
  it('大样本均值接近 0、标准差接近 1', () => {
    const random = createRandom(2026)
    const samples = Array.from({ length: 4000 }, () => gaussian(random))
    const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length
    const variance =
      samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length

    expect(Math.abs(mean)).toBeLessThan(0.1)
    expect(Math.sqrt(variance)).toBeGreaterThan(0.85)
    expect(Math.sqrt(variance)).toBeLessThan(1.15)
  })
})

describe('pick', () => {
  it('总是返回数组内元素', () => {
    const random = createRandom(1)
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(pick(random, items))
    }
  })

  it('空数组抛错', () => {
    expect(() => pick(createRandom(1), [])).toThrow()
  })
})
