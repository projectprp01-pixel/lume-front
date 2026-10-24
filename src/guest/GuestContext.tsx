import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getBookingByToken } from '../api/endpoints'
import type { ApiBooking, ApiTokenResult } from '../api/types'
import { identifyGuest } from '../analytics'

// The guest app is opened from a per-booking link that carries the Guest.bookingToken from
// lume-backend — the property app's form `/g/<token>` (https://app.lume-cxm.com/g/<token>), or the
// older `?token=<token>` query param, which still works. We resolve it
// once via GET /api/checkin/booking/:token into the guest + booking, and keep
// the token in localStorage so hash navigation and reloads stay authenticated.

const TOKEN_KEY = 'lume_booking_token'

type GuestStatus = 'no-token' | 'loading' | 'ready' | 'error'

type GuestValue = {
  status: GuestStatus
  error: string | null
  token: string | null
  guestId: string | null
  guest: ApiTokenResult['guest'] | null
  booking: ApiBooking | null
  // Re-resolve the booking (e.g. after submitting check-in) without the loading gate.
  refresh: () => Promise<void>
}

const GuestContext = createContext<GuestValue | null>(null)

function readToken(): string | null {
  const fromPath = window.location.pathname.match(/^\/g\/([^/]+)/)?.[1]
  const fromUrl = (fromPath && decodeURIComponent(fromPath)) || new URLSearchParams(window.location.search).get('token')
  if (fromUrl) {
    localStorage.setItem(TOKEN_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(TOKEN_KEY)
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [token] = useState<string | null>(readToken)
  const [status, setStatus] = useState<GuestStatus>(token ? 'loading' : 'no-token')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiTokenResult | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setStatus('loading')

    getBookingByToken(token)
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        // A bad/expired token shouldn't trap the guest — drop it so the app
        // falls back to its catalog (public) data instead of a hard error.
        localStorage.removeItem(TOKEN_KEY)
        setError(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // Tie all PostHog events to this specific guest.
  useEffect(() => {
    if (!result?.guest?.id) return
    identifyGuest(result.guest.id, {
      name: result.guest.fullName,
      email: result.guest.email,
      phone: result.guest.mobileNumber,
      propertyName: result.booking?.propertyName,
      arrivalDate: result.booking?.arrivalDate?.slice(0, 10),
      checkoutDate: result.booking?.checkoutDate?.slice(0, 10),
    })
  }, [result])

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      setResult(await getBookingByToken(token))
    } catch {
      /* keep the last known booking */
    }
  }, [token])

  const value = useMemo<GuestValue>(
    () => ({
      status,
      error,
      token,
      guestId: result?.guest.id ?? null,
      guest: result?.guest ?? null,
      booking: result?.booking ?? null,
      refresh,
    }),
    [status, error, token, result, refresh],
  )

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error('useGuest must be used within GuestProvider')
  return ctx
}
