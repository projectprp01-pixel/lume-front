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

const minutesOfDay = (hhmm: string | undefined, fallback: string): number => {
  const [h, m] = (/^\d{1,2}:\d{2}/.test(hhmm ?? '') ? (hhmm as string) : fallback).split(':').map(Number)
  return h * 60 + m
}

/**
 * True when a slot starting at `time` ("HH:MM") on `dayIso` ("YYYY-MM-DD") would still be running after the
 * property's checkout time on the guest's checkout day (start + `durationMinutes`) — the guest has left by
 * then, so it must not be offered. One that finishes exactly at the checkout time is still allowed.
 * Pass a dining slot's end time as `time` with no duration.
 */
export function slotAfterCheckout(s: StayTimes, dayIso: string, time: string | undefined, durationMinutes = 0): boolean {
  if (!s.checkoutDate || !dayIso || !time || !/^\d{1,2}:\d{2}/.test(time)) return false
  const d = new Date(s.checkoutDate)
  const checkoutIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (checkoutIso !== dayIso) return false
  return minutesOfDay(time, '00:00') + Math.max(0, durationMinutes) > minutesOfDay(s.checkOutTime, DEFAULT_CHECK_OUT)
}

/**
 * True when a slot starting at `time` ("HH:MM") on `dayIso` falls before the property's check-in time on the
 * guest's arrival day — they haven't arrived yet, so it must not be offered. A slot starting exactly at the
 * check-in time is still allowed.
 */
export function slotBeforeCheckin(s: StayTimes, dayIso: string, time: string | undefined): boolean {
  if (!s.arrivalDate || !dayIso || !time || !/^\d{1,2}:\d{2}/.test(time)) return false
  const d = new Date(s.arrivalDate)
  const arrivalIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (arrivalIso !== dayIso) return false
  return minutesOfDay(time, '00:00') < minutesOfDay(s.checkInTime, DEFAULT_CHECK_IN)
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
