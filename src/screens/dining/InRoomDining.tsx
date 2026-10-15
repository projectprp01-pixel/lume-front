import { useMemo, useState } from 'react'
import PageShell from '../../components/PageShell'
import ScreenTitle from '../../components/ScreenTitle'
import { useNav } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import { getInRoomMenu } from '../../api/endpoints'
import type { ApiFbCategory, ApiFbDish, ApiInRoomMenu } from '../../api/types'
import { formatClock, formatRupees } from '../../api/format'
import { useCart } from './CartContext'
import icClock from '../../assets/dining/ic-clock.svg'
import icWarnClock from '../../assets/inroom/ic-clock-warn.svg'
import icOpenFull from '../../assets/inroom/ic-open-full.svg'
import dietVeg from '../../assets/inroom/diet-veg.svg'
import dietNonVeg from '../../assets/inroom/diet-nonveg.svg'
import './InRoomDining.css'

// In-room dining menu (Figma "In-room Dining" 1020:3601, closed variant 2038:18133).
// Reads the kitchen state + menu from GET /guests/in-room-dining/menu, lets the guest
// build a cart, and hands off to the cart screen to place the order.

const hhmmToMinutes = (t?: string) => {
  const [h, m] = (t ?? '').split(':').map(Number)
  return Number.isNaN(h) ? null : h * 60 + (m || 0)
}

// The single category open right now ("Lunch"), used for the "In-room Dining: Lunch" title.
function currentMeal(categories: ApiFbCategory[]): string | null {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const open = categories.filter((c) => {
    const a = hhmmToMinutes(c.openTime)
    const b = hhmmToMinutes(c.closeTime)
    if (a == null || b == null) return false
    return a <= b ? mins >= a && mins < b : mins >= a || mins < b
  })
  return open.length === 1 ? open[0].name : null
}

function kitchenNotice(kitchen: ApiInRoomMenu['kitchen']): { title: string; sub?: string } | null {
  if (!kitchen.open) {
    return {
      title: 'Kitchen Closed Temporarily',
      sub:
        kitchen.reason === 'outside-hours'
          ? `Orders open ${formatClock(kitchen.opens)} – ${formatClock(kitchen.closes)}`
          : 'Sorry! We are currently facing difficulties but will be back soon',
    }
  }
  if (kitchen.closesInMinutes != null && kitchen.closesInMinutes <= 60) {
    return { title: `Kitchen closes in ${kitchen.closesInMinutes}min` }
  }
  return null
}

function DietSign({ type }: { type: ApiFbDish['dietType'] }) {
  // Egg is treated as non-veg on the sign, as is usual on Indian menus.
  const veg = type === 'Veg' || type === 'Vegan'
  return <img className="ird-diet" src={veg ? dietVeg : dietNonVeg} alt={veg ? 'Vegetarian' : 'Non-vegetarian'} />
}

export function Stepper({ qty, onAdd, onRemove }: { qty: number; onAdd: () => void; onRemove: () => void }) {
  if (qty === 0) {
    return (
      <button className="ird-add" onClick={onAdd} aria-label="Add">
        +
      </button>
    )
  }
  return (
    <div className="ird-stepper">
      <button onClick={onRemove} aria-label="Remove one">
        −
      </button>
      <span>{qty}</span>
      <button onClick={onAdd} aria-label="Add one">
        +
      </button>
    </div>
  )
}

export default function InRoomDining() {
  const { param: startCategory, navigate } = useNav()
  const cart = useCart()
  const { data: menu, loading, error } = useFetch(() => getInRoomMenu(), [])
  const [tab, setTab] = useState<string>(startCategory || 'all')

  const kitchen = menu?.kitchen
  const categories = useMemo(() => menu?.categories ?? [], [menu])
  const visible = tab === 'all' ? categories : categories.filter((c) => c._id === tab)
  const meal = useMemo(() => currentMeal(categories), [categories])
  const notice = kitchen ? kitchenNotice(kitchen) : null
  const canOrder = !!kitchen?.open

  const total = cart.subtotal + cart.gst + (cart.count > 0 ? (kitchen?.packagingCharge ?? 0) : 0)

  return (
    <PageShell>
      <main className="ird">
        <div className="ird-head">
          <ScreenTitle title={meal ? `In-room Dining: ${meal}` : 'In-room Dining'} back="dining" />
          {kitchen && (
            <p className="ird-meta">
              <img src={icClock} alt="" />
              {formatClock(kitchen.opens)} - {formatClock(kitchen.closes)}
            </p>
          )}

          {notice && (
            <div className="ird-notice" role="status">
              <img src={icWarnClock} alt="" />
              <div>
                <p className="ird-notice__title">{notice.title}</p>
                {notice.sub && <p className="ird-notice__sub">{notice.sub}</p>}
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <button className="ird-menus" onClick={() => navigate('dining-menus')}>
              View all menus
              <img src={icOpenFull} alt="" />
            </button>
          )}
        </div>

        {loading && !menu && <p className="ird-status">Loading the menu…</p>}
        {error && !menu && (
          <p className="ird-status">In-room dining isn’t available right now. Please try again shortly.</p>
        )}
        {menu && categories.length === 0 && <p className="ird-status">The menu is being updated.</p>}

        {categories.length > 0 && (
          <>
            <div className="ird-tabs" role="tablist">
              {[{ _id: 'all', name: 'All' }, ...categories].map((c) => (
                <button
                  key={c._id}
                  role="tab"
                  aria-selected={tab === c._id}
                  className={`ird-tab ${tab === c._id ? 'ird-tab--on' : ''}`}
                  onClick={() => setTab(c._id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="ird-body">
              {visible.map((cat) => (
                <section className="ird-section" key={cat._id}>
                  <div className="ird-section__head">
                    <h2 className="font-display ird-section__title">{cat.name}</h2>
                    {cat.openTime && cat.closeTime && (
                      <p className="ird-section__avail">
                        Available {formatClock(cat.openTime)} - {formatClock(cat.closeTime)}
                      </p>
                    )}
                  </div>

                  {cat.subcategories.map((sub) => (
                    <div className="ird-sub" key={sub._id}>
                      {cat.subcategories.length > 1 && <h3 className="ird-sub__title">{sub.name}</h3>}
                      <ul className="ird-dishes">
                        {sub.dishes.map((d) => (
                          <li className="ird-dish" key={d._id}>
                            <div className="ird-dish__img">
                              {d.imageUrl && <img src={d.imageUrl} alt="" loading="lazy" />}
                            </div>
                            <div className="ird-dish__main">
                              <div className="ird-dish__text">
                                <p className="ird-dish__name">
                                  <DietSign type={d.dietType} />
                                  <span>{d.name}</span>
                                </p>
                                {d.description && <p className="ird-dish__desc">{d.description}</p>}
                              </div>
                              <div className="ird-dish__foot">
                                <span className="ird-dish__price">{formatRupees(d.price)}</span>
                                {canOrder && (
                                  <Stepper
                                    qty={cart.qtyOf(d._id)}
                                    onAdd={() => cart.add(d)}
                                    onRemove={() => cart.remove(d._id)}
                                  />
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}

        {/* Bottom bar — total + cart/order */}
        <footer className="ird-bar">
          <p className="ird-bar__total">
            <span>
              <strong>Total</strong> <small>(In-room dining)</small>
            </span>
            <strong>{formatRupees(total)}</strong>
          </p>
          <div className="ird-bar__actions">
            <button className="ird-btn ird-btn--outline" onClick={() => navigate('inroom-cart')}>
              View cart ({cart.count})
            </button>
            <button
              className="ird-btn ird-btn--primary"
              onClick={() => navigate('inroom-cart')}
              disabled={!canOrder || cart.count === 0}
            >
              Order Now
            </button>
          </div>
        </footer>
      </main>
    </PageShell>
  )
}
