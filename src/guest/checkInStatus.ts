import { getCheckInByGuest } from '../api/endpoints'
import type { ApiCheckIn } from '../api/types'
import { useFetch } from '../api/useFetch'
import { useGuest } from './GuestContext'

// Check-in is per person: every guest on the booking has their own ID card. Booking.checkInStatus is
// only a rollup (it flips to 'submitted' as soon as ONE person's ID is in), so it can't tell us whether
// the whole party is done. The truth is each guest's document on the CheckIn record:
//   missing  - no ID uploaded yet
//   review   - uploaded, waiting for the hotel to verify
//   approved - verified by the hotel
//   rejected - the hotel sent it back; the guest must re-upload
export type GuestCheckInState = 'missing' | 'review' | 'approved' | 'rejected'

export type CheckInSummary = {
  total: number
  /** One entry per person, index 0 = guest number 1. */
  states: GuestCheckInState[]
  /** Everyone submitted AND the hotel has processed (approved) every one. */
  allDone: boolean
  anyRejected: boolean
  /** Everyone has uploaded (whatever their review state) and nobody is rejected. */
  allSubmitted: boolean
}

// Adults + children on the booking: each of them has an ID card to submit.
export function partySize(booking: { numberOfGuests?: number; numberOfChildren?: number } | null | undefined): number {
  return (booking?.numberOfGuests ?? 0) + (booking?.numberOfChildren ?? 0)
}

export function summarizeCheckIn(checkIn: ApiCheckIn | null | undefined, expectedGuests?: number): CheckInSummary {
  const total = Math.max(expectedGuests || 0, checkIn?.totalGuests || 0, 1)
  const docs = checkIn?.guestDocuments ?? []
  const states: GuestCheckInState[] = Array.from({ length: total }, (_, i) => {
    const d = docs.find((x) => x.guestNumber === i + 1)
    if (!d) return 'missing'
    if (d.rejectionReason) return 'rejected'
    return d.verified ? 'approved' : 'review'
  })
  const anyRejected = states.includes('rejected')
  return {
    total,
    states,
    anyRejected,
    allDone: states.every((s) => s === 'approved'),
    allSubmitted: !anyRejected && states.every((s) => s !== 'missing'),
  }
}

// Live check-in state for the signed-in guest's booking. `loading` is true until the first answer, so
// callers don't flash a banner / pick a route off an unknown state.
export function useCheckInSummary(): CheckInSummary & { loading: boolean } {
  const { guestId, booking } = useGuest()
  const { data, loading } = useFetch(() => getCheckInByGuest(guestId as string), [guestId], !!guestId)
  const summary = summarizeCheckIn(data, partySize(booking))
  return { ...summary, loading: !!guestId && loading && data === null }
}
