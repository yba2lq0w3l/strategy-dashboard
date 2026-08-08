/**
 * 确定性伪随机。
 *
 * 后端当前没有 PnL / 遥测接口，权益曲线与信号流为前端合成数据。
 * 使用可播种的 PRNG 而非 Math.random，保证同一组策略在多次渲染、
 * 多次轮询之间得到稳定一致的曲线（否则大屏会在每次刷新时抖动）。
 */

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type RandomFn = () => number

/** mulberry32：小而快、分布良好的可播种 PRNG。 */
export function createRandom(seed: number): RandomFn {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller 变换，产出标准正态分布样本。 */
export function gaussian(random: RandomFn): number {
  const u = Math.max(random(), Number.EPSILON)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function pick<T>(random: RandomFn, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() 需要非空数组')
  return items[Math.floor(random() * items.length) % items.length]
}
