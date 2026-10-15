import { useSyncExternalStore } from 'react'

// Live refresh: the dashboard can flip a toggle at any moment, and the guest app should reflect it
// without a reload. One shared clock ticks every LIVE_INTERVAL_MS while the tab is visible (and
// immediately when the tab regains focus); every live `useFetch` re-runs on each tick.
const LIVE_INTERVAL_MS = 20_000

let tick = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function bump() {
  tick += 1
  listeners.forEach((l) => l())
}

function onVisible() {
  if (document.visibilityState === 'visible') bump()
}

function start() {
  if (timer) return
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') bump()
  }, LIVE_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
  window.addEventListener('online', onVisible)
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('focus', onVisible)
  window.removeEventListener('online', onVisible)
}

function subscribe(l: () => void) {
  listeners.add(l)
  start()
  return () => {
    listeners.delete(l)
    if (listeners.size === 0) stop()
  }
}

/** Increments every time the app should re-read live data. */
export function useLiveTick(enabled = true): number {
  const t = useSyncExternalStore(
    enabled ? subscribe : () => () => {},
    () => tick,
    () => 0,
  )
  return enabled ? t : 0
}
