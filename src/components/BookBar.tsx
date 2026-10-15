import { useState, type ReactNode } from 'react'
import { useTripCart } from '../cart/TripCart'
import CartSheet from '../cart/CartSheet'
import { useBookingGate } from '../guest/BookingGate'
import { formatPrice } from '../api/format'
import './BookBar.css'

// The one sticky "Total + actions" bar every booking page uses (Experience, Spa, Dining, Transport —
// Figma: Total row, then [Add to cart (n)] [Book Now]). The cart is shared across all of them:
// `current` is this page's selection, the Total adds whatever is already in the cart, and the
// "n items in your cart" link opens the cart sheet. `onAdd` is the page's "Add to cart"; without it
// the button is hidden. `children` replaces the whole bar (the post-booking confirmation).
export default function BookBar({
  current = 0,
  currency,
  onAdd,
  addDisabled,
  book,
  children,
}: {
  current?: number
  currency?: string
  onAdd?: () => void
  addDisabled?: boolean
  book?: { label: string; onClick: () => void; disabled?: boolean }
  children?: ReactNode
}) {
  const cart = useTripCart()
  const gate = useBookingGate()
  const [sheet, setSheet] = useState(false)
  const total = current + cart.total

  return (
    <footer className="bk-bar">
      {children ?? (
        <>
          {cart.count > 0 && (
            <button type="button" className="bk-bar__cartlink" onClick={() => setSheet(true)}>
              {cart.count} {cart.count === 1 ? 'item' : 'items'} in your cart · View
            </button>
          )}
          <div className="bk-bar__total">
            <span>Total</span>
            <span>{total > 0 ? formatPrice(total, currency) : '₹0'}</span>
          </div>
          <div className="bk-bar__actions">
            {onAdd && (
              <button type="button" className="bk-btn bk-btn--outline" onClick={() => gate(onAdd)} disabled={addDisabled}>
                Add to cart ({cart.count})
              </button>
            )}
            {book && (
              <button type="button" className="bk-btn bk-btn--primary" onClick={() => gate(book.onClick)} disabled={book.disabled}>
                {book.label}
              </button>
            )}
          </div>
        </>
      )}
      {sheet && <CartSheet onClose={() => setSheet(false)} />}
    </footer>
  )
}
