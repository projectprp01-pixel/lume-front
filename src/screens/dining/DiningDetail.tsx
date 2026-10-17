import { useEffect, useMemo, useState } from 'react'
import MenuViewer from '../../components/MenuViewer'
import PdfThumb from '../../components/PdfThumb'
import BookBar from '../../components/BookBar'
import MediaStrip from '../../components/MediaStrip'
import PageShell from '../../components/PageShell'
import MobileTopBar from '../../components/MobileTopBar'
import DesktopNav from '../../components/DesktopNav'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useTripCart, type NewCartItem } from '../../cart/TripCart'
import { useDiscounted } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import { useFetch } from '../../api/useFetch'
import { getRestaurants, getDiningAvailability } from '../../api/endpoints'
import type { ApiRestaurant } from '../../api/types'
import { formatDayMonth, formatPrice, formatTime12 } from '../../api/format'
import icBack from '../../assets/nav/ic-back.svg'
import lanterns from '../../assets/dining/lanterns.png'
import './DiningDetail.css'

// Dining detail + reservation — Intimate Dining (Figma 1468:4791) and Outdoor Dining
// (Figma 1468:5000) share this layout. Opened from a Dining card via
// navigate('dining-detail', <facilityId>). Shows the gallery, price, inclusions and
// menus (tap a menu to open the viewer); when the facility takes reservations it also
// lets the guest pick a day, time, party size and add-ons, and reserves via
// POST /guests/dining/book. Info-only restaurants just show the information.

// Backend slot → "Sunset Dinner · 6:00 pm to 8:00 pm" (name, when set, plus the timings).
function slotLabel(s: NonNullable<ApiRestaurant['slots']>[number]): string {
  const times = [s.startTime, s.endTime].filter(Boolean).map(formatTime12).join(' to ')
  return [s.name, times].filter(Boolean).join(' · ')
}

const isImage = (url?: string) => !!url && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

// ["lunch","dinner"] → "Lunch and Dinner"
function mealsLabel(r: ApiRestaurant): string {
  const meals = (r.mealTimes ?? []).map(cap)
  if (meals.length <= 1) return meals[0] ?? ''
  return `${meals.slice(0, -1).join(', ')} and ${meals[meals.length - 1]}`
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Day = { iso: string; dow: string; dom: string; bookable: boolean }

// Next 7 days from today (or the stay's arrival, if it is still ahead), marking days the
// facility doesn't run on / has blocked.
function buildDays(facility: ApiRestaurant, arrivalIso?: string, checkoutIso?: string): Day[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  if (arrivalIso) {
    const arr = new Date(arrivalIso)
    arr.setHours(0, 0, 0, 0)
    if (arr.getTime() > base.getTime()) base.setTime(arr.getTime())
  }
  const last = checkoutIso ? new Date(checkoutIso) : null
  last?.setHours(0, 0, 0, 0)
  const days: Day[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    if (last && d.getTime() > last.getTime()) break
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dow = DOW[d.getDay()]
    const runsToday = !facility.availableDays?.length || facility.availableDays.includes(dow)
    days.push({
      iso,
      dow: dow.toUpperCase(),
      dom: String(d.getDate()),
      bookable:
        runsToday &&
        !facility.blockedDates?.some((b) => String(b).slice(0, 10) === iso) &&
        !facility.blockedRanges?.some((r) => iso >= r.start.slice(0, 10) && iso <= r.end.slice(0, 10)),
    })
  }
  return days
}

export default function DiningDetail() {
  const { param: facilityId, navigate } = useNav()
  const { guestId, booking } = useGuest()
  const discounted = useDiscounted()
  const cart = useTripCart()

  const { data: all, loading, error } = useFetch(() => getRestaurants(), [])
  const facility = useMemo(() => all?.find((r) => r._id === facilityId) ?? null, [all, facilityId])

  const days = useMemo(
    () => (facility ? buildDays(facility, booking?.arrivalDate, booking?.checkoutDate) : []),
    [facility, booking],
  )
  const firstBookable = days.find((d) => d.bookable)?.iso ?? days[0]?.iso ?? ''
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const dayIso = pickedDay ?? firstBookable
  const [slot, setSlot] = useState<string | null>(null)
  const [guests, setGuests] = useState(2)
  const [addons, setAddons] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  const { data: avail } = useFetch(
    () => getDiningAvailability(facilityId as string, dayIso),
    [facilityId, dayIso],
    !!facilityId && !!dayIso,
  )

  // Changing the selection after a reservation starts a new one. (Must stay above the early returns
  // below — hooks can't run conditionally.)
  useEffect(() => setDone(false), [dayIso, slot, guests, addons])

  if (loading && !facility) {
    return (
      <PageShell>
        <div className="dd dd--status">Loading…</div>
      </PageShell>
    )
  }
  if (error || !facility) {
    return (
      <PageShell>
        <div className="dd dd--status">
          <button className="dd__back dd__back--inline" onClick={() => navigate('dining')} aria-label="Back">
            <img src={icBack} alt="" />
          </button>
          <p>Couldn’t load this dining experience.</p>
        </div>
      </PageShell>
    )
  }

  const photos = [facility.imageUrl, ...(facility.images ?? [])].filter(Boolean)
  const hero = photos[0] ?? lanterns

  const isIntimate = facility.facilityType === 'intimate_dining'
  // Intimate dining is always reservable; a restaurant only when set to take reservations.
  const bookable = isIntimate || facility.bookingMode === 'reservations'
  // Restaurants read "Lunch and Dinner • Specialty restaurant"; intimate evenings show what they serve
  // ("Breakfast, Lunch, Dinner" — as in the dashboard's preview; no times, the slot picker has those).
  const heroMeta = isIntimate
    ? (facility.mealTimes ?? []).map(cap).join(', ')
    : [mealsLabel(facility), facility.subtitle || (facility.cuisine ?? []).join(', ')]
        .filter(Boolean)
        .join(' • ')
  const listPrice = facility.price ?? 0
  // Dining Hub promotion tagged to this facility (the server applies the same one when booking).
  const priced = discounted('dining', facility._id, listPrice)
  const unitPrice = priced.price
  const perPerson = !!facility.guestCanChooseGroupSize
  const maxGuests = facility.maxGuests ?? 10
  const description = facility.description ?? ''
  const included = facility.whatsIncluded ?? []
  const menus = (facility.menus ?? []).filter((m) => m.fileUrl)
  const facilityAddons = facility.addons ?? []

  const slots = (facility.slots ?? []).filter((s) => s.active !== false)
  // Only the slots the property saved: no slots means no "Select a Time" step (opening hours are not a slot).
  const slotOptions = slots.map(slotLabel)

  // Tables left that night, less what's already in the cart for this facility and day.
  const left = avail?.remaining != null ? avail.remaining - cart.heldOn('dining', facility._id, dayIso) : undefined
  const soldOut = avail ? !avail.available || (left != null && left <= 0) : false
  const dayBookable = days.find((d) => d.iso === dayIso)?.bookable ?? true

  const addonsTotal = facilityAddons
    .filter((a) => addons.has(a.name))
    .reduce((sum, a) => sum + (a.price ?? 0), 0)
  const total = unitPrice * (perPerson ? guests : 1) + addonsTotal

  const toggleAddon = (name: string) =>
    setAddons((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  // This page's current selection as a cart entry (null, with an error shown, when it is incomplete).
  const currentItem = (): NewCartItem | null => {
    if (!slot && slotOptions.length) {
      setBookError('Please select a time.')
      return null
    }
    return {
      kind: 'dining',
      title: facility.name,
      detail: [formatDayMonth(dayIso), slot, perPerson ? `${guests} ${guests === 1 ? 'guest' : 'guests'}` : ''].filter(Boolean).join(' · '),
      amount: total,
      req: {
        facilityId: facility._id,
        guestId: guestId ?? undefined,
        bookingId: booking?._id ?? booking?.id,
        date: dayIso,
        numberOfGuests: guests,
        addonNames: [...addons],
      },
    }
  }

  const addToCart = () => {
    const item = currentItem()
    if (!item) return
    setBookError(null)
    cart.add(item)
    setSlot(null)
    setAddons(new Set())
    setNote('Added to your cart. Pick something else, or tap Book Now to book everything.')
  }

  // Book Now books this selection together with everything already in the cart.
  const book = async () => {
    const extra = slot || !slotOptions.length ? currentItem() : null
    if (!extra && cart.count === 0) {
      setBookError('Please select a time.')
      return
    }
    setBusy(true)
    setBookError(null)
    setNote(null)
    const payableTotal = total + cart.total
    const result = await cart.checkout(extra ? [extra] : [])
    setBusy(false)
    if (result.status === 'done') {
      setPaid(payableTotal > 0)
      setDone(true)
    } else if (result.status === 'dismissed') {
      setBookError('Payment was not completed, so nothing has been booked. Your items are still in your cart.')
    } else setBookError(result.message)
  }

  return (
    <div className="dd-shell">
      <MobileTopBar />
      <DesktopNav />
      <main className="dd">
        {/* Hero */}
        <header className="dd-hero" style={{ backgroundImage: `url(${hero})` }}>
          <div className="dd-hero__scrim" />
          <button className="dd__back" onClick={() => navigate('dining')} aria-label="Back">
            <img src={icBack} alt="" />
          </button>
          <div className="dd-hero__text">
            <h1 className="font-display dd-hero__title">{facility.name}</h1>
            {heroMeta && <p className="dd-hero__meta">{heroMeta}</p>}
          </div>
        </header>

        {/* Tapping a photo opens it full screen (swipe through all); the hero stays the main photo. */}
        {photos.length > 1 && <MediaStrip items={photos.map((src) => ({ src }))} />}

        <div className="dd-body">
          {/* Price + description */}
          <section className="dd-intro">
            {listPrice > 0 && (
              <p className="dd-price">
                <span className="font-display dd-price__amount">{priced.original != null ? <PriceText priced={priced} /> : formatPrice(unitPrice)}</span>{' '}
                <span className="dd-price__unit">{perPerson ? 'per person' : facility.pricingLabel || 'per booking'}</span>
              </p>
            )}
            {description && (
              <>
                <p className={`dd-desc ${expanded ? '' : 'dd-desc--clamped'}`}>{description}</p>
                {description.length > 140 && (
                  <button className="dd-seemore" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'See less' : 'See more'}
                    <svg
                      className={`dd-seemore__chev ${expanded ? 'dd-seemore__chev--up' : ''}`}
                      viewBox="0 0 20 20"
                      width="20"
                      height="20"
                      aria-hidden="true"
                    >
                      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </section>

          {included.length > 0 && (
            <section className="dd-section">
              <h2 className="font-display dd-section__title">What’s Included</h2>
              <ul className="dd-included">
                {included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {menus.length > 0 && (
            <section className="dd-section">
              <h2 className="font-display dd-section__title">Menu</h2>
              <div className="dd-menus">
                {menus.map((m, i) => (
                  <button
                    type="button"
                    className="dd-menu"
                    key={`${m.fileUrl}-${i}`}
                    onClick={() => setMenuOpen(i)}
                    aria-label={`View ${m.label || 'menu'}`}
                  >
                    <span className="dd-menu__page">
                      {isImage(m.fileUrl) ? (
                        <img src={m.fileUrl} alt="" />
                      ) : (
                        <PdfThumb url={m.fileUrl ?? ""} />
                      )}
                    </span>
                    <span className="dd-menu__label">{m.label || 'Menu'}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Select Day */}
          {bookable && (
          <section className="dd-section">
            <h2 className="font-display dd-section__title">Select Day</h2>
            <div className="dd-days">
              {days.map((d) => (
                <button
                  key={d.iso}
                  className={`dd-day ${dayIso === d.iso ? 'dd-day--on' : ''}`}
                  disabled={!d.bookable}
                  onClick={() => {
                    setPickedDay(d.iso)
                    setSlot(null)
                  }}
                >
                  <span className="dd-day__dow">{d.dow}</span>
                  <span className="dd-day__dom">{d.dom}</span>
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Select a Time */}
          {bookable && slotOptions.length > 0 && (
            <section className="dd-section">
              <h2 className="font-display dd-section__title">Select a Time</h2>
              <div className="dd-slots">
                {slotOptions.map((label) => {
                  const full = soldOut || !dayBookable
                  return (
                    <button
                      key={label}
                      className={`dd-slot ${slot === label ? 'dd-slot--on' : ''} ${full ? 'dd-slot--full' : ''}`}
                      disabled={full}
                      onClick={() => setSlot(label)}
                    >
                      {label.split(' · ').map((part, i) => (
                        <span className="dd-slot__time" key={i}>{part}</span>
                      ))}
                      <span className="dd-slot__avail">
                        {full ? 'Full' : left === 1 ? 'Only 1 slot left' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* No. of Guests */}
          {bookable && perPerson && (
            <section className="dd-guests">
              <h2 className="font-display dd-section__title">No. of Guests</h2>
              <div className="dd-stepper">
                <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Fewer guests">−</button>
                <span>{guests}</span>
                <button onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} aria-label="More guests">+</button>
              </div>
            </section>
          )}

          {/* Add-ons */}
          {bookable && facilityAddons.length > 0 && (
            <section className="dd-section">
              <h2 className="font-display dd-section__title">Add-ons</h2>
              <div className="dd-addons">
                {facilityAddons.map((a) => {
                  const on = addons.has(a.name)
                  return (
                    <button
                      type="button"
                      className={`dd-addon ${on ? 'dd-addon--on' : ''}`}
                      key={a.name}
                      aria-pressed={on}
                      onClick={() => toggleAddon(a.name)}
                    >
                      <span className="dd-addon__head">
                        <span className={`dd-check ${on ? 'dd-check--on' : ''}`} aria-hidden="true">
                          {on && (
                            <svg viewBox="0 0 24 24" width="23" height="23">
                              <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="dd-addon__name">{a.name}</span>
                      </span>
                      {a.description && <span className="dd-addon__desc">{a.description}</span>}
                      <span className="dd-addon__price">+{formatPrice(a.price ?? 0)} per booking</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {bookError && <p className="dd-error">{bookError}</p>}
          {note && !bookError && <p className="dd-note dd-note--ok">{note}</p>}
        </div>

        {/* Bottom bar — total + reserve (only for reservable facilities) */}
        {bookable && (
        done ? (
          <BookBar>
            <div className="bk-done">
              <p className="bk-done__title">{paid ? 'Reservation confirmed' : 'Reservation requested'}</p>
              <p className="bk-done__sub">We’ll confirm your {facility.name} evening shortly.</p>
              <button type="button" className="bk-btn bk-btn--primary" onClick={() => navigate('dining')}>
                Back to Dining
              </button>
            </div>
          </BookBar>
        ) : (
          <BookBar
            current={slot || !slotOptions.length || cart.count === 0 ? total : 0}
            onAdd={addToCart}
            addDisabled={busy || soldOut || !dayBookable}
            book={{
              label: busy
                ? 'Processing…'
                : soldOut || !dayBookable
                  ? 'Unavailable'
                  : total + cart.total > 0
                      ? 'Book & Pay'
                      : isIntimate
                        ? 'Book Now'
                        : 'Reserve Now',
              onClick: book,
              disabled: busy || soldOut || !dayBookable,
            }}
          />
        )
        )}
      </main>

      {menuOpen != null && (
        <MenuViewer menus={menus} startIndex={menuOpen} onClose={() => setMenuOpen(null)} />
      )}
    </div>
  )
}
