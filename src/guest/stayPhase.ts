export type StayPhase = 'pre' | 'in' | 'post'

// Date-only stay phase (time-of-day ignored): before arrival is pre-stay, the
// arrival→checkout window (inclusive) is in-stay, and after checkout the link is
// treated as expired.
export function stayPhase(arrivalDate?: string, checkoutDate?: string): StayPhase {
  if (!arrivalDate || !checkoutDate) return 'in'
  const atMidnight = (d: Date) => {
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const today = atMidnight(new Date())
  const arrival = atMidnight(new Date(arrivalDate))
  const checkout = atMidnight(new Date(checkoutDate))
  if (today > checkout) return 'post'
  if (today < arrival) return 'pre'
  return 'in'
}
