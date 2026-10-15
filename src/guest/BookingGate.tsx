import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useGuest } from './GuestContext'
import { useAppConfig } from './AppConfig'
import { isCheckedIn, useNow } from './stayTimes'
import icClose from '../assets/requests/ic-close.svg'
import './BookingGate.css'

// Once the guest is checked in (past the property's check-in time), bookings are arranged with the
// front office: every "Add to cart" / "Book Now" / pay action, on any SKU, opens this popup instead of
// going through. Before check-in everything works as normal. Wrap an action in `useBookingGate()`.

type Gate = (action: () => void) => void

const GateContext = createContext<Gate>((action) => action())

export function BookingGateProvider({ children }: { children: ReactNode }) {
  const { booking } = useGuest()
  const { settings } = useAppConfig()
  const now = useNow()
  const [open, setOpen] = useState(false)

  const locked = isCheckedIn(
    {
      arrivalDate: booking?.arrivalDate,
      checkoutDate: booking?.checkoutDate,
      checkInTime: settings?.checkInTime,
      checkOutTime: settings?.checkOutTime,
    },
    now,
  )

  const gate = useCallback<Gate>(
    (action) => {
      if (locked) setOpen(true)
      else action()
    },
    [locked],
  )
  const value = useMemo(() => gate, [gate])
  const name = settings?.propertyName || booking?.propertyName || 'Evolve Back'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <GateContext.Provider value={value}>
      {children}
      {open && (
        <div className="bgate" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="bgate__card"
            role="dialog"
            aria-modal="true"
            aria-label={`Welcome to ${name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="bgate__close" onClick={() => setOpen(false)} aria-label="Close">
              <img src={icClose} alt="" />
            </button>
            <h2 className="font-display bgate__title">Welcome to {name}.</h2>
            <p>
              Our team would be delighted to personally assist you with any reservations or special requests during
              your stay.
            </p>
            <p>
              Please contact the Front Office from your in-room phone or visit us at the reception, and we will be happy
              to help.
            </p>
            <p>We wish you a wonderful stay with us.</p>
          </div>
        </div>
      )}
    </GateContext.Provider>
  )
}

export function useBookingGate(): Gate {
  return useContext(GateContext)
}
