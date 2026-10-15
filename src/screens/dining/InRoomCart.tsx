import { useState } from 'react'
import PageShell from '../../components/PageShell'
import ScreenTitle from '../../components/ScreenTitle'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useFetch } from '../../api/useFetch'
import { getInRoomMenu, createInRoomOrder } from '../../api/endpoints'
import { formatRupees } from '../../api/format'
import { useCart } from './CartContext'
import { Stepper } from './InRoomDining'
import dietVeg from '../../assets/inroom/diet-veg.svg'
import dietNonVeg from '../../assets/inroom/diet-nonveg.svg'
import './InRoomDining.css'
import './InRoomCart.css'

// In-room dining cart + checkout (Figma "Your Cart" 1280:10091; with the room-number
// field 2683:11687). The order is billed to the room and settled at checkout, so
// "Proceed to Checkout" places the order (POST /guests/in-room-dining/orders).

export default function InRoomCart() {
  const { navigate } = useNav()
  const { guestId, booking } = useGuest()
  const cart = useCart()
  const { data: menu } = useFetch(() => getInRoomMenu(), [])

  const knownRoom = booking?.roomNumber || ''
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<{ room: string; total: number; items: number } | null>(null)

  const kitchen = menu?.kitchen
  const packaging = cart.count > 0 ? (kitchen?.packagingCharge ?? 0) : 0
  const total = cart.subtotal + cart.gst + packaging
  const needsRoom = !knownRoom
  const roomValue = knownRoom || room.trim()

  const place = async () => {
    if (!guestId) return
    if (!roomValue) {
      setError('Please enter your room number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createInRoomOrder({
        guestId,
        room: roomValue,
        notes: notes.trim() || undefined,
        items: cart.lines.map((l) => ({ dishId: l.dish._id, qty: l.qty })),
      })
      setPlaced({ room: roomValue, total, items: cart.count })
      cart.clear()
    } catch (err) {
      setError((err as Error).message || 'We couldn’t place your order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (placed) {
    return (
      <PageShell>
        <main className="irc irc--done">
          <h1 className="font-display irc-done__title">Order placed</h1>
          <p className="irc-done__sub">
            Thank you! Your {placed.items} {placed.items === 1 ? 'item is' : 'items are'} being prepared and will
            be brought to room {placed.room}. {formatRupees(placed.total)} will be added to your bill and settled at
            checkout.
          </p>
          <button className="ird-btn ird-btn--primary irc-done__btn" onClick={() => navigate('dining')}>
            Back to Dining
          </button>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <main className="irc">
        <div className="irc-head">
          <ScreenTitle title="Your Cart" back="inroom-dining" />
        </div>

        {cart.lines.length === 0 ? (
          <div className="irc-empty">
            <p>Your cart is empty.</p>
            <button className="ird-btn ird-btn--outline" onClick={() => navigate('inroom-dining')}>
              Browse the menu
            </button>
          </div>
        ) : (
          <div className="irc-body">
            <ul className="irc-lines">
              {cart.lines.map(({ dish, qty }) => (
                <li className="irc-line" key={dish._id}>
                  <div className="irc-line__img">{dish.imageUrl && <img src={dish.imageUrl} alt="" />}</div>
                  <div className="irc-line__main">
                    <div className="irc-line__text">
                      <p className="irc-line__name">
                        <img
                          src={dish.dietType === 'Veg' || dish.dietType === 'Vegan' ? dietVeg : dietNonVeg}
                          alt=""
                        />
                        <span>{dish.name}</span>
                      </p>
                      <p className="irc-line__sub">
                        {[dish.dietType, dish.serves ? `Serves ${dish.serves}` : ''].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <div className="irc-line__foot">
                      <span className="irc-line__price">{formatRupees(dish.price * qty)}</span>
                      <Stepper qty={qty} onAdd={() => cart.add(dish)} onRemove={() => cart.remove(dish._id)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <section className="irc-field">
              <h2 className="font-display irc-field__title">Notes</h2>
              <textarea
                className="irc-notes"
                rows={3}
                maxLength={500}
                placeholder="Any special requests, dietary notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </section>

            {needsRoom && (
              <section className="irc-field">
                <h2 className="font-display irc-field__title">Room Number</h2>
                <input
                  className="irc-room"
                  type="text"
                  inputMode="numeric"
                  placeholder="Select"
                  aria-label="Room number"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </section>
            )}

            <section className="irc-field">
              <h2 className="font-display irc-field__title">Order Summary</h2>
              <div className="irc-summary">
                <ul>
                  {cart.lines.map(({ dish, qty }) => (
                    <li key={dish._id}>
                      <span>
                        {dish.name}
                        {qty > 1 ? ` × ${qty}` : ''}
                      </span>
                      <span>{formatRupees(dish.price * qty)}</span>
                    </li>
                  ))}
                  {cart.gst > 0 && (
                    <li>
                      <span>GST</span>
                      <span>{formatRupees(cart.gst)}</span>
                    </li>
                  )}
                  {packaging > 0 && (
                    <li>
                      <span>Packaging</span>
                      <span>{formatRupees(packaging)}</span>
                    </li>
                  )}
                </ul>
                <p className="irc-summary__total">
                  <span>
                    Total ({cart.count} {cart.count === 1 ? 'item' : 'items'})
                  </span>
                  <span>{formatRupees(total)}</span>
                </p>
              </div>
            </section>

            {error && <p className="irc-error">{error}</p>}
          </div>
        )}

        {cart.lines.length > 0 && (
          <footer className="ird-bar">
            <p className="ird-bar__total">
              <strong>Total ({cart.count} {cart.count === 1 ? 'item' : 'items'})</strong>
              <strong>{formatRupees(total)}</strong>
            </p>
            <button
              className="ird-btn ird-btn--primary irc-checkout"
              onClick={place}
              disabled={busy || !guestId || (kitchen != null && !kitchen.open)}
            >
              {busy ? 'Placing order…' : kitchen != null && !kitchen.open ? 'Kitchen closed' : 'Proceed to Checkout'}
            </button>
          </footer>
        )}
      </main>
    </PageShell>
  )
}
