import { useEffect, useMemo, useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import PageShell from '../../components/PageShell'
import NotAvailable from '../../components/NotAvailable'
import ScreenTitle from '../../components/ScreenTitle'
import BookBar from '../../components/BookBar'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useTripCart, type NewCartItem } from '../../cart/TripCart'
import { useFetch } from '../../api/useFetch'
import { getSpaFacilities, getSpaTimeSlots } from '../../api/endpoints'
import { formatDayMonth, formatMinutes, formatPrice, formatTime12, spaDuration, withTaxNote } from '../../api/format'
import { buildDays } from '../experiences/ExperienceDetail'
import PriceText from '../../components/PriceText'
import { useDiscounted } from '../../guest/AppConfig'
import icBack from '../../assets/nav/ic-back.svg'
import icClock from '../../assets/home/ic-clock.svg'
import icDot from '../../assets/home/ic-dot.svg'
// Same booking-page look as an experience (day / time / guests), plus the Transport action bar.
import '../experiences/ExperienceDetail.css'
import '../transport/Transport.css'
import './SpaDetail.css'

// Spa treatment page (Figma "Experiences- Spa detail" 1472:5423 and "...with image" 3769:11244).
// With a treatment photo it opens on an inset hero (title + duration over the image); without one it
// is the plain title row. Then price, description, What's Included, day, duration, time, guests,
// add-ons, and a fixed Total + Book bar. Opened from a treatment card via navigate('spa-detail', id).
// Treatment capacity in the dashboard is how many bookings a slot takes, not how many guests one booking can
// have, so the guest stepper has its own ceiling.
const MAX_SPA_GUESTS = 6

export default function SpaDetail() {
  const { param: treatmentId, navigate } = useNav()
  const { guest, guestId, booking } = useGuest()
  const cart = useTripCart()
  const discounted = useDiscounted()

  const { data: facilities, loading, error } = useFetch(() => getSpaFacilities(), [])
  const found = useMemo(() => {
    for (const facility of facilities ?? []) {
      for (const cat of facility.categories ?? []) {
        const treatment = (cat.treatments ?? []).find((t) => t._id === treatmentId)
        if (treatment) return { facility, category: cat.name, treatment }
      }
    }
    return null
  }, [facilities, treatmentId])

  const days = useMemo(
    () => buildDays(booking?.arrivalDate, booking?.checkoutDate),
    [booking?.arrivalDate, booking?.checkoutDate],
  )
  const [dayIso, setDayIso] = useState(days[0]?.iso ?? '')
  const [slot, setSlot] = useState('')
  const [guests, setGuests] = useState(1)
  // Which of the treatment's listed durations is chosen (index into durations[]).
  const [durIdx, setDurIdx] = useState(0)
  const [addons, setAddons] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const facilityId = found?.facility._id
  const { data: slotData } = useFetch(
    // Places per slot don't depend on the party size (it's compared with them on the page), so changing the
    // guest count never reloads the slots or drops the chosen time.
    () => getSpaTimeSlots(facilityId as string, dayIso, 1),
    [facilityId, dayIso],
    !!facilityId && !!dayIso,
  )

  // Days the spa or this treatment is closed: not an available weekday, or a blocked date.
  const isClosed = (iso: string) => {
    if (!found) return false
    const { facility, treatment } = found
    const dow = new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
    if (facility.availableDays?.length && !facility.availableDays.includes(dow)) return true
    const blocked = [...(facility.blockedDates ?? []), ...(treatment.blockedDates ?? [])].map((d) => String(d).slice(0, 10))
    return blocked.includes(iso)
  }
  useEffect(() => {
    if (!found || !isClosed(dayIso)) return
    setDayIso(days.find((d) => !isClosed(d.iso))?.iso ?? '')
    setSlot('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, dayIso, days])

  // Changing the selection after a booking starts a new one.
  useEffect(() => setDone(false), [dayIso, slot, guests, durIdx, addons])

  // A slot that fills up (live refresh) while chosen is dropped so another time is picked.
  useEffect(() => {
    if (slot && slotData?.some((s) => s.time === slot && !s.available)) setSlot('')
  }, [slotData, slot])

  if (loading && !facilities) {
    return (
      <PageShell>
        <div className="xd xd--status">Loading…</div>
      </PageShell>
    )
  }
  if (facilities != null && facilities.length === 0) {
    return (
      <PageShell>
        <NotAvailable title="The spa isn't available right now" />
      </PageShell>
    )
  }
  if (error || !found) {
    return (
      <PageShell>
        <div className="xd xd--status">
          <button className="xd__back xd__back--inline" onClick={() => navigate('spa')}>
            <img src={icBack} alt="Back" />
          </button>
          <p>Couldn’t load this treatment.</p>
        </div>
      </PageShell>
    )
  }

  const { facility, category, treatment } = found
  const durations = treatment.durations?.filter((d) => d.minutes > 0) ?? []
  const chosen = durations[durIdx]
  const minutes = chosen?.minutes ?? spaDuration(treatment)
  const listPrice = chosen?.price ?? treatment.price ?? 0
  // The server re-applies the same Spa Hub discount at booking time; this is what the guest sees and the cart carries.
  const priced = discounted('spa', treatment._id as string, listPrice)
  const unitPrice = priced.price
  const treatmentAddons = (treatment.addons ?? []).filter((a) => a.name)
  const pickedAddons = treatmentAddons.filter((a) => addons.has(a.name))
  const total = unitPrice * guests + pickedAddons.reduce((s, a) => s + (a.price ?? 0), 0)

  // Treatments have no photo of their own in the dashboard, so the page is Figma's plain title-row
  // version (back arrow, name, duration • category). A treatment photo, if one ever exists, opens the hero variant.
  const photo = treatment.imageUrl || treatment.image || ''
  const included = (treatment.included ?? []).filter(Boolean)
  const description = treatment.description || ''
  const meta = [minutes ? formatMinutes(minutes) : '', category].filter(Boolean)
  const slotLabel = (time: string) => treatment.timeSlots?.find((x) => x.startTime === time)?.label?.trim() || ''

  // Offer the treatment's own start times when it lists any (matching the spa's bookable slots).
  const allSlots = slotData ?? facility.timeSlots?.map((t) => ({ time: t, available: true, remaining: 0 })) ?? []
  const own = new Set((treatment.timeSlots ?? []).map((x) => x.startTime))
  const slots = own.size > 0 && allSlots.some((s) => own.has(s.time)) ? allSlots.filter((s) => own.has(s.time)) : allSlots

  // Places left in a slot after what's already in the cart for it (a spa's slots are shared by its treatments);
  // null = no count known (remaining 0 on an available slot only happens without live slot data).
  const placesLeft = (s: { time: string; available: boolean; remaining: number }) =>
    s.remaining > 0 || !s.available ? s.remaining - cart.heldOn('spa', facility._id, dayIso, s.time) : null
  // The guest count can't go past the places left in the chosen slot.
  const chosenSlot = slots.find((s) => s.time === slot)
  const maxGuests = Math.max(1, Math.min(MAX_SPA_GUESTS, (chosenSlot && placesLeft(chosenSlot)) ?? MAX_SPA_GUESTS))

  const toggleAddon = (name: string) =>
    setAddons((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  // This page's current selection as a cart entry (null, with an error shown, when it is incomplete).
  const currentItem = (): NewCartItem | null => {
    if (!slot) {
      setBookError('Please select a time slot.')
      return null
    }
    return {
      kind: 'spa',
      title: treatment.name,
      detail: [formatDayMonth(dayIso), formatTime12(slot), `${guests} ${guests === 1 ? 'guest' : 'guests'}`].join(' · '),
      amount: total,
      req: {
        spaFacilityId: facility._id,
        treatmentId: treatment._id as string,
        treatmentName: treatment.name,
        categoryName: category,
        guestId: guestId ?? undefined,
        guestName: guest?.fullName ?? 'Guest',
        numberOfGuests: guests,
        date: dayIso,
        timeSlot: slot,
        duration: minutes,
        price: total,
        addons: pickedAddons.map((a) => ({ name: a.name, price: a.price ?? 0 })),
        propertyId: facility.propertyId ?? '',
      },
    }
  }

  const addToCart = () => {
    const item = currentItem()
    if (!item) return
    setBookError(null)
    cart.add(item)
    setSlot('')
    setAddons(new Set())
    setNote('Added to your cart. Pick another treatment, or tap Book Now to book everything.')
  }

  // Book Now books this selection together with everything already in the cart.
  const book = async () => {
    const extra = slot ? currentItem() : null
    if (!extra && cart.count === 0) {
      setBookError('Please select a time slot.')
      return
    }
    setBusy(true)
    setBookError(null)
    setNote(null)
    const result = await cart.checkout(extra ? [extra] : [])
    setBusy(false)
    if (result.status === 'done') setDone(true)
    else if (result.status === 'dismissed') setBookError('Payment was not completed, so nothing has been booked. Your items are still in your cart.')
    else setBookError(result.message)
  }

  const actionBar = (
    <BookBar
      current={slot || cart.count === 0 ? total : 0}
      onAdd={addToCart}
      addDisabled={busy || done || !slot}
      book={{
        label: done
          ? 'Booked ✓'
          : busy
            ? 'Processing…'
            : total + cart.total > 0
                ? 'Book & Pay'
                : 'Book Now',
        onClick: book,
        disabled: busy || done || (!slot && cart.count === 0),
      }}
    />
  )

  const metaRow = (onMedia: boolean) => (
    <p className={`spd-meta ${onMedia ? 'spd-meta--on-media' : ''}`}>
      {meta.map((m, i) => (
        <span className="spd-meta__item" key={i}>
          {i === 0 && minutes ? <img src={icClock} alt="" /> : null}
          {i > 0 && <img className="dot" src={icDot} alt="" />}
          {m}
        </span>
      ))}
    </p>
  )

  return (
    <ScreenChrome bottom={actionBar}>
      <main className="spd">
        {photo ? (
          <header className="spd-hero" style={{ backgroundImage: `url(${photo})` }}>
            <div className="spd-hero__scrim" />
            <button className="spd-hero__back" onClick={() => navigate('spa')} aria-label="Back">
              <img src={icBack} alt="" />
            </button>
            <div className="spd-hero__text">
              <h1 className="font-display spd-hero__title">{treatment.name}</h1>
              {metaRow(true)}
            </div>
          </header>
        ) : (
          <div className="spd-head">
            <ScreenTitle title={treatment.name} back="spa" />
            {metaRow(false)}
          </div>
        )}

        <div className="spd-body">
          <p className="xd-price">
            {listPrice === 0 ? (
              'Complimentary'
            ) : priced.original != null ? (
              <PriceText priced={priced} unit={withTaxNote(` ${(treatment.pricingLabel || 'per person').toLowerCase()}`)} />
            ) : (
              <>
                <span className="xd-price__amt">{formatPrice(unitPrice)}</span>
                <span className="xd-price__unit">{withTaxNote(` ${(treatment.pricingLabel || 'per person').toLowerCase()}`)}</span>
              </>
            )}
          </p>

          {description && (
            <div className="xd-desc">
              <p className={expanded ? '' : 'xd-desc--clamped'}>{description}</p>
              {description.length > 120 && (
                <button className="xd-seemore" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'See less' : 'See more'}
                </button>
              )}
            </div>
          )}

          {included.length > 0 && (
            <section className="xd-section">
              <h2 className="font-display xd-section__title">What’s Included</h2>
              <div className="xd-chips">
                {included.map((inc) => (
                  <span className="xd-chip" key={inc}>
                    {inc}
                    <span aria-hidden>✓</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="xd-section">
            <h2 className="font-display xd-section__title">Select Day</h2>
            <div className="xd-days">
              {days.map((d) => (
                <button
                  key={d.iso}
                  className={`xd-day ${dayIso === d.iso ? 'xd-day--active' : ''} ${isClosed(d.iso) ? 'xd-day--blocked' : ''}`}
                  disabled={isClosed(d.iso)}
                  title={isClosed(d.iso) ? 'Not available on this date' : undefined}
                  onClick={() => { setDayIso(d.iso); setSlot('') }}
                >
                  <span className="xd-day__dow">{d.dow}</span>
                  <span className="xd-day__dom">{d.dom}</span>
                </button>
              ))}
            </div>
          </section>

          {durations.length > 1 && (
            <section className="xd-section">
              <h2 className="font-display xd-section__title">Duration</h2>
              <div className="xd-slots">
                {durations.map((d, i) => (
                  <button
                    key={d.minutes}
                    className={`xd-slot ${durIdx === i ? 'xd-slot--active' : ''}`}
                    onClick={() => setDurIdx(i)}
                  >
                    <span className="xd-slot__time">{formatMinutes(d.minutes)}</span>
                    <span className="xd-slot__avail">{formatPrice(discounted('spa', treatment._id as string, d.price ?? treatment.price ?? 0).price)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="xd-section">
            <h2 className="font-display xd-section__title">Select a Time</h2>
            {!dayIso && <p className="xd-error">No dates are available for this treatment during your stay.</p>}
            <div className="xd-slots">
              {(dayIso ? slots : []).map((s) => {
                // Full once fewer places are left than guests (so 2 guests on a 1-place slot reads Full);
                // a count is only shown for the last place.
                const left = placesLeft(s)
                const full = !s.available || (left != null && left < guests)
                return (
                  <button
                    key={s.time}
                    className={`xd-slot ${slot === s.time ? 'xd-slot--active' : ''} ${full ? 'xd-slot--full' : ''}`}
                    disabled={full}
                    onClick={() => setSlot(s.time)}
                  >
                    {slotLabel(s.time) && <span className="xd-slot__label">{slotLabel(s.time)}</span>}
                    <span className="xd-slot__time">{formatTime12(s.time)}</span>
                    <span className="xd-slot__avail">{full ? 'Full' : left === 1 ? 'Only 1 slot left' : ''}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="xd-section xd-guests">
            <h2 className="font-display xd-section__title">No. of Guests</h2>
            <div className="xd-stepper">
              <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Fewer">−</button>
              <span>{guests}</span>
              <button
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                disabled={guests >= maxGuests}
                aria-label="More"
              >
                +
              </button>
            </div>
          </section>

          {treatmentAddons.length > 0 && (
            <section className="xd-section">
              <h2 className="font-display xd-section__title">Add-ons</h2>
              <div className="xd-addons">
                {treatmentAddons.map((a) => (
                  <button
                    type="button"
                    className={`xd-addon ${addons.has(a.name) ? 'xd-addon--on' : ''}`}
                    key={a.name}
                    aria-pressed={addons.has(a.name)}
                    onClick={() => toggleAddon(a.name)}
                  >
                    <span className="xd-addon__head">
                      <span className={`xd-check ${addons.has(a.name) ? 'xd-check--on' : ''}`} aria-hidden="true">
                        {addons.has(a.name) && (
                          <svg viewBox="0 0 24 24" width="23" height="23">
                            <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="xd-addon__name">{a.name}</span>
                    </span>
                    {a.description && <span className="xd-addon__desc">{a.description}</span>}
                    <span className="xd-addon__price">+{formatPrice(a.price ?? 0)} per booking</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {bookError && <p className="xd-error">{bookError}</p>}
          {note && !bookError && <p className="xd-note">{note}</p>}
        </div>
      </main>
    </ScreenChrome>
  )
}
