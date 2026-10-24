import type { ApiExperience } from './types'

// Shared formatting helpers for turning backend values into the display strings
// the screens already expect.

/** ₹1,200 · "Complimentary" when free. Currency defaults to INR. */
/** A stay of N nights as "4 days / 3 nights" (arrival day through checkout day). */
export function stayDaysNights(nights: number): string {
  const n = Math.max(1, Math.round(nights))
  return `${n + 1} days / ${n} ${n === 1 ? 'night' : 'nights'}`
}

export function formatPrice(amount?: number, currency = 'INR'): string {
  if (amount == null || amount === 0) return 'Complimentary'
  const symbol = currency === 'INR' ? '₹' : ''
  return `${symbol}${amount.toLocaleString('en-IN')}`
}

/** "₹ 1,000 per person" style, used on cards that spell out the unit. */
export function formatPricePerPerson(amount?: number, currency = 'INR'): string {
  if (amount == null || amount === 0) return 'Complimentary'
  return `${formatPrice(amount, currency)} per person`
}

/** Thumbnail unit: just "per group" / "per person", dropping the property's explanation ("inclusive of tax…"). */
export function cardUnit(label?: string): string {
  const l = (label ?? '').toLowerCase()
  if (/group|couple|booking/.test(l)) return 'per group'
  if (/person|head|guest|pax|adult/.test(l)) return 'per person'
  return l.replace(/\(.*?\)/g, '').replace(/\b(incl|inclusive|excl|exclusive)\b.*$/, '').trim() || 'per person'
}

/** Unit for an activity: the dashboard's Per person / Per group setting (pricing.pricePerPerson) wins over the free-text label. */
export function expUnit(e: { pricingLabel?: string; pricing?: { pricePerPerson?: boolean } }): string {
  const u = cardUnit(e.pricingLabel)
  if (e.pricing?.pricePerPerson === false) return u === 'per person' ? 'per group' : u
  if (e.pricing?.pricePerPerson === true) return u === 'per group' || u === 'per vehicle' ? 'per person' : u
  return u
}

/** The unit text after a price (" per person (incl. taxes)"): the property's own label, else " per person". */
export function priceUnit(label?: string): string {
  return ` ${label?.trim() || 'per person'}`
}

/** Adds "(including taxes)" after a price unit on detail pages, unless the property's own label already says so. */
export function withTaxNote(unit: string): string {
  return /tax/i.test(unit) ? unit : `${unit} (including taxes)`
}

/** "₹3,000 Per group" — the amount plus the property's unit label (defaults to "per person"); 0 reads "Complimentary". */
export function formatPriceWithUnit(amount?: number, label?: string, currency = 'INR'): string {
  if (amount == null || amount === 0) return 'Complimentary'
  return `${formatPrice(amount, currency)} ${label?.trim() || 'per person'}`
}

/** "12 Jun" */
export function formatDayMonth(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "Today at 5:30 pm" / "16 Jun 2026, 2:40 pm" relative to now. */
export function formatTimestamp(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `Today at ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`
}

/** True if the given ISO datetime or plain YYYY-MM-DD falls on the local today. */
export function isToday(dateLike?: string): boolean {
  if (!dateLike) return false
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateLike)
    ? new Date(`${dateLike}T00:00:00`)
    : new Date(dateLike)
  if (Number.isNaN(d.getTime())) return false
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

/** Minutes-since-midnight for a slot like "7:00 pm", "07:00 AM", "14:00", or a
 * range "9:00 am - 9:00 pm" (takes the start). Returns null if unparseable. */
export function minutesOfDay(timeStr?: string): number | null {
  if (!timeStr) return null
  const first = timeStr.split(/[-–]/)[0].trim()
  const m = first.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const period = m[3]?.toLowerCase()
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return h * 60 + min
}

/** Opening-hours range like "9:00 am - 9:00 pm" from 24h "HH:MM" strings. */
export function formatHoursRange(open?: string, close?: string): string {
  const to12 = (hhmm?: string): string => {
    if (!hhmm) return ''
    const [h, m] = hhmm.split(':').map(Number)
    if (Number.isNaN(h)) return ''
    const period = h >= 12 ? 'pm' : 'am'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${period}`
  }
  const a = to12(open)
  const b = to12(close)
  if (a && b) return `${a} - ${b}`
  return a || b
}

/** "07:00" → "7:00 am" */
export function formatClock(hhmm?: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  const period = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

/** ₹796.50 — an amount to pay (0 is "₹0", never "Complimentary"); whole rupees drop the decimals. */
export function formatRupees(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** "16:00" / "07:00 AM" -> "4:00 pm" / "7:00 am" (slot times come in either form). */
export function formatTime12(t?: string): string {
  if (!t) return ''
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i)
  if (!m) return t
  let h = Number(m[1])
  const mer = m[3]?.toLowerCase()
  if (mer === 'pm' && h < 12) h += 12
  if (mer === 'am' && h === 12) h = 0
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'pm' : 'am'}`
}

// "1 hr 30 min" from the numeric duration set in the dashboard; the free-text display string is only a
// fallback because it can drift from the real duration.
export function formatDuration(e: ApiExperience): string {
  const d = e.duration
  if (d?.value) {
    const min = d.unit === 'hours' ? d.value * 60 : d.unit === 'days' ? d.value * 1440 : d.value
    return formatMinutes(min)
  }
  return e.durationDisplayText || ''
}

/** 45 -> '45 min', 75 -> '1 hr 15 min', 120 -> '2 hr' */
export function formatMinutes(min?: number): string {
  if (!min || min <= 0) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

/** Bookable length of a spa treatment: its first listed duration, else the legacy single one. */
export function spaDuration(t: { duration?: number; durations?: { minutes: number }[] }): number | undefined {
  return t.durations?.[0]?.minutes || t.duration
}
