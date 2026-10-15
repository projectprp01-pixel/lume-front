import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  createDiningReservation,
  createExperienceBooking,
  createSpaBooking,
  createTransportBooking,
} from '../api/endpoints'
import { payForBookings } from '../api/razorpay'
import { useGuest } from '../guest/GuestContext'

// One cart for everything a guest can book — experiences, spa treatments, dining reservations and
// transport. Each page's "Add to cart" stores a fully-formed booking request; "Book Now" books the
// page's current selection together with whatever is already in the cart. Bookings are separate
// records on the backend (each is priced there and paid on its own), so checkout creates and pays
// them one after another. Kept in sessionStorage so a reload mid-trip doesn't empty it.

const KEY = 'lume_trip_cart'

export type CartItem = {
  id: string
  title: string
  /** "12 Oct · 10:00 am · 2 guests" — shown in the cart sheet. */
  detail: string
  /** What the guest sees (list price + add-ons); the server re-prices every booking. */
  amount: number
  /** An unpaid booking already created for this item (payment pop-up closed): retry pays it, never duplicates. */
  bookingId?: string
} & (
  | { kind: 'experience'; req: Parameters<typeof createExperienceBooking>[0] }
  | { kind: 'spa'; req: Parameters<typeof createSpaBooking>[0] }
  | { kind: 'dining'; req: Parameters<typeof createDiningReservation>[0] }
  | { kind: 'transport'; req: Parameters<typeof createTransportBooking>[0] }
)

export type NewCartItem = CartItem extends infer T ? (T extends CartItem ? Omit<T, 'id' | 'bookingId'> : never) : never

export type CheckoutResult =
  | { status: 'done'; booked: number }
  | { status: 'dismissed'; booked: number }
  | { status: 'error'; booked: number; message: string }

type CartValue = {
  items: CartItem[]
  count: number
  total: number
  /** Something was already created and is waiting for payment. */
  hasUnpaid: boolean
  add: (item: NewCartItem) => void
  remove: (id: string) => void
  clear: () => void
  /** Places already in the cart for this facility/day (and slot): guests for experiences and spa, tables for dining. */
  heldOn: (kind: 'experience' | 'spa' | 'dining', id: string | undefined, date: string, time?: string) => number
  /** Books and pays everything in the cart, plus `extra` (the page's current selection). */
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
  const { guest } = useGuest()
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
      // Everything not yet booked stays in the cart until it is paid, so a failure loses nothing.
      if (added.length) setItems((prev) => [...prev, ...added])
      const queue = [...itemsRef.current, ...added]
      let booked = 0
      // 1) Create every booking that doesn't exist yet. Free ones (transport) are done right away; paid
      //    ones stay in the cart, with their booking id, until the single payment below succeeds.
      const toPay: { item: CartItem; bookingId: string }[] = []
      for (const item of queue) {
        try {
          let bookingId = item.bookingId
          let payable = !!bookingId
          if (!bookingId) {
            if (item.kind === 'experience') {
              const r = await createExperienceBooking(item.req)
              bookingId = r._id
              payable = (r.totalAmount ?? 0) > 0
            } else if (item.kind === 'spa') {
              const r = await createSpaBooking(item.req)
              bookingId = r._id
              payable = (r.price ?? item.amount) > 0
            } else if (item.kind === 'dining') {
              const r = await createDiningReservation(item.req)
              bookingId = r._id
              payable = (r.amount ?? 0) > 0
            } else {
              await createTransportBooking(item.req) // transport is arranged by the desk, no online payment
              bookingId = undefined
              payable = false
            }
          }
          if (payable && bookingId) {
            const id = bookingId
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, bookingId: id } : i)))
            toPay.push({ item, bookingId: id })
          } else {
            booked += 1
            setItems((prev) => prev.filter((i) => i.id !== item.id))
          }
        } catch (err) {
          return { status: 'error', booked, message: (err as Error).message || 'Booking failed. Please try again.' }
        }
      }
      // 2) One payment for everything that is payable.
      if (toPay.length) {
        try {
          const result = await payForBookings({
            bookingIds: toPay.map((t) => t.bookingId),
            description: toPay.length === 1 ? toPay[0].item.title : `${toPay.length} bookings`,
            prefill: { name: guest?.fullName, email: guest?.email, contact: guest?.mobileNumber },
          })
          if (result === 'dismissed') return { status: 'dismissed', booked }
          const paidIds = new Set(toPay.map((t) => t.item.id))
          booked += toPay.length
          setItems((prev) => prev.filter((i) => !paidIds.has(i.id)))
        } catch (err) {
          return { status: 'error', booked, message: (err as Error).message || 'Payment failed. Please try again.' }
        }
      }
      return { status: 'done', booked }
    },
    [guest],
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
      hasUnpaid: items.some((i) => !!i.bookingId),
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
