import { useEffect, useState } from 'react'

// Time-of-day aware stay state. `stayPhase` (stayPhase.ts) only looks at dates; the property's check-in
// and checkout times (Property Settings, "HH:MM" 24-hour) decide when, on the arrival and checkout day,
// the guest counts as checked in / checked out.

const DEFAULT_CHECK_IN = '14:00'
const DEFAULT_CHECK_OUT = '11:00'

// Start of the booking's calendar day, read the same way stayPhase does so the two always agree.
function dayStart(date: string): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function at(date: string, hhmm: string | undefined, fallback: string): number {
  const [h, m] = (/^\d{1,2}:\d{2}$/.test(hhmm ?? '') ? (hhmm as string) : fallback).split(':').map(Number)
  const d = dayStart(date)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

export type StayTimes = {
  arrivalDate?: string
  checkoutDate?: string
  checkInTime?: string
  checkOutTime?: string
}

/** Past the check-in time on the arrival day (or any later day) and not yet checked out. */
export function isCheckedIn(s: StayTimes, now = Date.now()): boolean {
  if (!s.arrivalDate) return false
  return now >= at(s.arrivalDate, s.checkInTime, DEFAULT_CHECK_IN) && !isCheckedOut(s, now)
}

/** Past the checkout time on the checkout day (or any later day). */
export function isCheckedOut(s: StayTimes, now = Date.now()): boolean {
  if (!s.checkoutDate) return false
  return now >= at(s.checkoutDate, s.checkOutTime, DEFAULT_CHECK_OUT)
}

/** Re-renders every minute so a screen left open flips at the check-in / checkout time. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
