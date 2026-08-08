import { useState } from 'react'
import { useInterval } from './useInterval'

/** 每 tickMs 推进一次的当前时间戳，用于驱动“N 秒前”这类相对时间展示。 */
export function useNow(tickMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now())
  useInterval(() => setNow(Date.now()), tickMs)
  return now
}
