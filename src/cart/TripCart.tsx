import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  createDiningReservation,
  createExperienceBooking,
  createSpaBooking,
  createTransportBooking,
} from '../api/endpoints'
import { apiFetch } from '../api/client'
import { payForOrder, type CheckoutOrder } from '../api/razorpay'
import { useGuest } from '../guest/GuestContext'

// One cart for everything a guest can book — experiences, spa treatments, dining reservations and
// transport. Each page's "Add to cart" stores a fully-formed booking request; "Book Now" books the
// page's current selection together with whatever is already in the cart, in ONE call to the backend:
//   - a free cart is booked and confirmed straight away;
//   - a cart with anything paid opens a single Razorpay payment for the total, and the backend creates
//     every booking (free and paid together) only once that payment comes through.
// Nothing is created before payment, so closing the payment pop-up leaves no booking behind and a cart is
// never half-booked. Kept in sessionStorage so a reload mid-trip doesn't empty it.

const KEY = 'lume_trip_cart'

export type CartItem = {
  id: string
  title: string
  /** "12 Oct · 10:00 am · 2 guests" — shown in the cart sheet. */
  detail: string
  /** What the guest sees (list price + add-ons); the server re-prices every booking. */
  amount: number
} & (
  | { kind: 'experience'; req: Parameters<typeof createExperienceBooking>[0] }
  | { kind: 'spa'; req: Parameters<typeof createSpaBooking>[0] }
  | { kind: 'dining'; req: Parameters<typeof createDiningReservation>[0] }
  | { kind: 'transport'; req: Parameters<typeof createTransportBooking>[0] }
)

export type NewCartItem = CartItem extends infer T ? (T extends CartItem ? Omit<T, 'id'> : never) : never

export type CheckoutResult =
  | { status: 'done'; booked: number }
  | { status: 'dismissed'; booked: number }
  | { status: 'error'; booked: number; message: string }

type CartValue = {
  items: CartItem[]
  count: number
  total: number
  add: (item: NewCartItem) => void
  remove: (id: string) => void
  clear: () => void
  /** Places already in the cart for this facility/day (and slot): guests for experiences and spa, tables for dining. */
  heldOn: (kind: 'experience' | 'spa' | 'dining', id: string | undefined, date: string, time?: string) => number
  /** Books everything in the cart plus `extra` (the page's current selection), paying first if anything is paid. */
  checkout: (extra?: NewCartItem[]) => Promise<CheckoutResult>
}

const TripCartContext = createContext<CartValue | null>(null)

function load(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function TripCartProvider({ children }: { children: ReactNode }) {
  const { guest, guestId } = useGuest()
  const [items, setItems] = useState<CartItem[]>(load)
  // checkout works on a snapshot, so keep the latest list reachable without re-creating the callback
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable — the cart just won't survive a reload */
    }
  }, [items])

  const add = useCallback((item: NewCartItem) => {
    setItems((prev) => [...prev, { ...item, id: newId() } as CartItem])
  }, [])
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const checkout = useCallback(
    async (extra: NewCartItem[] = []): Promise<CheckoutResult> => {
      const added = extra.map((e) => ({ ...e, id: newId() }) as CartItem)
      // The current selection joins the cart, so nothing the guest picked is lost if payment is dismissed.
      if (added.length) setItems((prev) => [...prev, ...added])
      const queue = [...itemsRef.current, ...added]
      if (!queue.length) return { status: 'done', booked: 0 }
      const bookedIds = new Set(queue.map((i) => i.id))
      try {
        const res = await apiFetch<
          { status: 'booked'; bookings: unknown[] } | ({ status: 'payment_required' } & CheckoutOrder)
        >('/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({ guestId, items: queue.map((i) => ({ kind: i.kind, req: i.req })) }),
        })
        if (res.status === 'payment_required') {
          const result = await payForOrder({
            order: res,
            description: queue.length === 1 ? queue[0].title : `${queue.length} bookings`,
            prefill: { name: guest?.fullName, email: guest?.email, contact: guest?.mobileNumber },
          })
          // Closed the pop-up: nothing was booked and the cart is untouched.
          if (result === 'dismissed') return { status: 'dismissed', booked: 0 }
        }
        setItems((prev) => prev.filter((i) => !bookedIds.has(i.id)))
        return { status: 'done', booked: queue.length }
      } catch (err) {
        return { status: 'error', booked: 0, message: (err as Error).message || 'Booking failed. Please try again.' }
      }
    },
    [guest, guestId],
  )

  const heldOn = useCallback<CartValue['heldOn']>(
    (kind, id, date, time) => {
      let held = 0
      for (const i of items) {
        if (i.kind !== kind) continue
        const r = i.req as { experienceId?: string; spaFacilityId?: string; facilityId?: string; date: string; timeSlot?: string; numberOfGuests: number }
        if ((r.experienceId ?? r.spaFacilityId ?? r.facilityId) !== id || r.date !== date) continue
        if (time !== undefined && r.timeSlot !== time) continue
        held += kind === 'dining' ? 1 : r.numberOfGuests || 1
      }
      return held
    },
    [items],
  )

  const value = useMemo<CartValue>(
    () => ({
      items,
      heldOn,
      count: items.length,
      total: items.reduce((s, i) => s + i.amount, 0),
      add,
      remove,
      clear,
      checkout,
    }),
    [items, heldOn, add, remove, clear, checkout],
  )

  return <TripCartContext.Provider value={value}>{children}</TripCartContext.Provider>
}

export function useTripCart() {
  const ctx = useContext(TripCartContext)
  if (!ctx) throw new Error('useTripCart must be used within TripCartProvider')
  return ctx
}
