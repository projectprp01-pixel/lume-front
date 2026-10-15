import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveTick } from './live'

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-run the fetcher (e.g. after a mutation). */
  refetch: () => void
}

// Runs an async fetcher and tracks loading/error/data. Pass `enabled: false`
// to skip (e.g. while the guest id isn't known yet). The fetcher is re-run
// whenever `deps` change or `refetch()` is called. Stale responses are ignored.
//
// By default the fetch is also "live": it silently re-runs every few seconds (see live.ts) so
// dashboard changes (toggles, publish/unpublish, prices, discounts) show up without a reload.
// Live re-runs never flip `loading` and never replace `data` with an identical payload, so screens
// don't flicker or reset local state. Pass `{ live: false }` for forms that must not be refreshed
// underneath the guest.
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  enabled = true,
  opts: { live?: boolean } = {},
): AsyncState<T> {
  const live = opts.live !== false
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const liveTick = useLiveTick(live && enabled)

  // Keep the latest fetcher without making it a dependency (callers pass inline
  // closures that change every render).
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  // The inputs of the last run, so we can tell a live tick apart from a real change.
  const lastRun = useRef<{ enabled: boolean; tick: number; deps: unknown[] } | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      lastRun.current = { enabled, tick, deps }
      return
    }

    const prev = lastRun.current
    const silent =
      prev != null &&
      prev.enabled === enabled &&
      prev.tick === tick &&
      prev.deps.length === deps.length &&
      prev.deps.every((d, i) => Object.is(d, deps[i]))
    lastRun.current = { enabled, tick, deps }

    let cancelled = false
    if (!silent) {
      setLoading(true)
      setError(null)
    }

    fetcherRef.current()
      .then((result) => {
        if (cancelled) return
        // Keep the old reference when nothing changed, so memos/effects keyed on `data` don't re-run.
        setData((old) => (old != null && JSON.stringify(old) === JSON.stringify(result) ? old : result))
        if (silent) setError(null)
      })
      .catch((err: Error) => {
        // A failed background refresh keeps showing the last good data.
        if (!cancelled && !silent) setError(err.message)
      })
      .finally(() => {
        // Also when silent: a background refresh may have superseded an in-flight first load.
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, liveTick, ...deps])

  return { data, loading, error, refetch }
}
