import { useEffect, useRef } from 'react'

/**
 * 声明式定时器：`delayMs <= 0` 时暂停。
 * 回调存于 ref，避免每次渲染重建定时器导致轮询漂移。
 */
export function useInterval(callback: () => void, delayMs: number): void {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs <= 0) return

    const id = setInterval(() => savedCallback.current(), delayMs)
    return () => clearInterval(id)
  }, [delayMs])
}
