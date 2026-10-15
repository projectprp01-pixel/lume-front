import { useEffect, useState } from 'react'
import { useTripCart } from './TripCart'
import { useBookingGate } from '../guest/BookingGate'
import { formatPrice } from '../api/format'
import icClose from '../assets/requests/ic-close.svg'
import './CartSheet.css'

// "Your cart" sheet: everything added from experiences, spa, dining and transport, with a remove
// control per item, and checkout. Checkout books every item (each is its own booking on the backend)
// and takes payment for each paid one in turn, so several bookings can be paid in one go.
export default function CartSheet({ onClose }: { onClose: () => void }) {
  const cart = useTripCart()
  const gate = useBookingGate()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [done, setDone] = useState<number | null>(null) // number of bookings just made

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Emptying the cart from inside the sheet closes it (but not the confirmation after a checkout).
  useEffect(() => {
    if (cart.count === 0 && done == null) onClose()
  }, [cart.count, done, onClose])

  const checkout = async () => {
    setBusy(true)
    setMessage(null)
    const result = await cart.checkout()
    setBusy(false)
    if (result.status === 'done') setDone(result.booked)
    else if (result.status === 'dismissed')
      setMessage({ ok: false, text: 'Payment was not completed. Your items are saved and nothing is lost. Tap Pay now to pay for everything together.' })
    else setMessage({ ok: false, text: result.message })
  }

  return (
    <div className="cartsheet" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="cartsheet__backdrop" onClick={() => !busy && onClose()} />
      <div className="cartsheet__panel">
        <div className="cartsheet__head">
          <h2 className="font-display cartsheet__title">{done != null ? 'Booked' : 'Your Cart'}</h2>
          <button className="cartsheet__close" onClick={() => !busy && onClose()} aria-label="Close">
            <img src={icClose} alt="" />
          </button>
        </div>

        {done != null ? (
          <>
            <p className="cartsheet__detail">
              {done === 1 ? 'Your booking is confirmed.' : `All ${done} bookings are confirmed.`} You can see them
              under Booked This Stay in your profile.
            </p>
            <button className="bk-btn bk-btn--primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <ul className="cartsheet__list">
              {cart.items.map((it) => (
                <li className="cartsheet__item" key={it.id}>
                  <div className="cartsheet__info">
                    <p className="cartsheet__name">{it.title}</p>
                    <p className="cartsheet__detail">{it.detail}</p>
                  </div>
                  <div className="cartsheet__side">
                    <span className="cartsheet__amount">{formatPrice(it.amount)}</span>
                    {!busy && (
                      <button className="cartsheet__remove" onClick={() => cart.remove(it.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="cartsheet__total">
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            {message && <p className={message.ok ? 'cartsheet__ok' : 'cartsheet__err'}>{message.text}</p>}
            <button className="bk-btn bk-btn--primary" onClick={() => gate(checkout)} disabled={busy || cart.count === 0}>
              {busy ? 'Processing…' : cart.hasUnpaid ? 'Pay now' : cart.total > 0 ? 'Book & Pay' : 'Book Now'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
