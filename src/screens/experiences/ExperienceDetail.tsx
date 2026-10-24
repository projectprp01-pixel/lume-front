import { useEffect, useMemo, useState } from 'react'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useTripCart, type NewCartItem } from '../../cart/TripCart'
import { useAppConfig, useDiscounted } from '../../guest/AppConfig'
import { slotAfterCheckout, slotBeforeCheckin } from '../../guest/stayTimes'
import PriceText from '../../components/PriceText'
import BookBar from '../../components/BookBar'
import PageShell from '../../components/PageShell'
import { useFetch } from '../../api/useFetch'
import { getExperienceById, getExperienceSlots } from '../../api/endpoints'
import { expUnit, experienceMinutes, formatDayMonth, formatDuration, formatPrice, formatTime12, priceUnit, withTaxNote } from '../../api/format'
import MediaStrip from '../../components/MediaStrip'
import type { MediaItem } from '../../components/MediaLightbox'
import icBack from '../../assets/nav/ic-back.svg'
import icClock from '../../assets/home/ic-clock.svg'
import culturalShow from '../../assets/experiences/exp-cultural-show.png'
import './ExperienceDetail.css'

// Experience detail + booking (Figma "Experiences- Detail" 1256:8269). Opened from
// any experience card via navigate('experience-detail', <id>). Pulls the full
// experience, shows gallery/price/inclusions, lets the guest pick day/time/guests
// /add-ons, and books via the guest booking endpoint.

function imgUrl(item: unknown): string | null {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, string>
    return o.image || o.url || null
  }
  return null
}

// Next 7 bookable days within the stay: from the arrival date if it's still ahead (pre-stay guests
// book for their stay, not for today), else from today, and never past checkout.
export function buildDays(arrivalIso?: string, checkoutIso?: string): { iso: string; dow: string; dom: string }[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  if (arrivalIso) {
    const arr = new Date(arrivalIso)
    arr.setHours(0, 0, 0, 0)
    if (arr.getTime() > base.getTime()) base.setTime(arr.getTime())
  }
  const last = checkoutIso ? new Date(checkoutIso) : null
  last?.setHours(0, 0, 0, 0)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    if (last && d.getTime() > last.getTime()) break
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      iso,
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dom: String(d.getDate()),
    })
  }
  return days
}

export default function ExperienceDetail() {
  const { param: experienceId, navigate } = useNav()
  const { guest, guestId, booking } = useGuest()
  const discounted = useDiscounted()
  const { settings: propertySettings } = useAppConfig()
  const cart = useTripCart()

  const { data: exp, loading, error } = useFetch(
    () => getExperienceById(experienceId as string),
    [experienceId],
    !!experienceId,
  )

  const days = useMemo(
    () => buildDays(booking?.arrivalDate, booking?.checkoutDate),
    [booking?.arrivalDate, booking?.checkoutDate],
  )
  const [dayIso, setDayIso] = useState(days[0]?.iso ?? '')
  const [slot, setSlot] = useState<string>('')
  const [guests, setGuests] = useState(1)
  const [addons, setAddons] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  // Slot availability for the selected day.
  const { data: slotData } = useFetch(
    () => getExperienceSlots(experienceId as string, dayIso),
    [experienceId, dayIso],
    !!experienceId && !!dayIso,
  )

  // The booking always sends the undiscounted list price; the server applies the promotion itself.
  const unitPrice = exp?.pricing?.basePrice ?? 0
  const priced = discounted('experience', exp?._id, unitPrice)
  const currency = exp?.pricing?.currency ?? 'INR'
  const addonsTotal = useMemo(() => {
    if (!exp?.addOns) return 0
    return exp.addOns.filter((a) => addons.has(a.name)).reduce((s, a) => s + (a.price ?? 0), 0)
  }, [exp, addons])
  // "Per group" activities (pricing.pricePerPerson === false) cost the same whatever the party size.
  const perPerson = exp?.pricing?.pricePerPerson !== false
  // Group activities (guest count not selectable in the dashboard) are bought as one unit: no stepper, guests stays 1.
  const chooseGuests = exp?.guestCanChooseGroupSize !== false
  const gMin = exp?.groupSize?.min
  const gMax = exp?.groupSize?.max
  const guestRange =
    gMin && gMax && gMin !== gMax ? `${gMin}–${gMax} guests` : gMax || gMin ? `${gMax || gMin} ${(gMax || gMin) === 1 ? 'guest' : 'guests'}` : ''
  const total = priced.price * (perPerson ? guests : 1) + addonsTotal

  const toggleAddon = (name: string) => {
    setAddons((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Days staff have blocked in the dashboard can't be picked (and have no slots).
  const isBlocked = (iso: string) => (exp?.blockedRanges ?? []).some((r) => iso >= r.start && iso <= r.end)
  useEffect(() => {
    if (!exp || !isBlocked(dayIso)) return
    const next = days.find((d) => !isBlocked(d.iso))
    setDayIso(next?.iso ?? '')
    setSlot('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp, dayIso, days])

  // Changing the selection after a booking starts a new one.
  useEffect(() => setDone(false), [dayIso, slot, guests, addons])

  // This page's current selection as a cart entry (null, with an error shown, when it is incomplete).
  const currentItem = (): NewCartItem | null => {
    if (!exp || !slot) {
      setBookError('Please select a time slot.')
      return null
    }
    return {
      kind: 'experience',
      title: exp.title,
      detail: [formatDayMonth(dayIso), formatTime12(slot), ...(chooseGuests ? [`${guests} ${guests === 1 ? 'guest' : 'guests'}`] : [])].join(' · '),
      amount: total,
      req: {
        experienceId: exp._id,
        guestId: guestId ?? undefined,
        guestName: guest?.fullName ?? 'Guest',
        guestEmail: guest?.email,
        guestPhone: guest?.mobileNumber,
        date: dayIso,
        timeSlot: slot,
        numberOfGuests: guests,
        price: unitPrice,
        addonNames: [...addons],
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
    setNote('Added to your cart. Pick another activity, or tap Book Now to book everything.')
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

  if (loading && !exp) {
    return (
      <PageShell>
        <div className="xd xd--status">Loading…</div>
      </PageShell>
    )
  }
  if (error || !exp) {
    return (
      <PageShell>
      <div className="xd xd--status">
        <button className="xd__back xd__back--inline" onClick={() => navigate('experiences')}>
          <img src={icBack} alt="Back" />
        </button>
        <p>Couldn’t load this experience.</p>
      </div>
      </PageShell>
    )
  }

  const heroImage = exp.imageUrl || imgUrl(exp.images?.[0]) || culturalShow
  // Photos then videos, as set up in the dashboard's media dialog.
  const media: MediaItem[] = [
    ...(exp.images ?? []).flatMap((it): MediaItem[] => {
      const src = imgUrl(it)
      const o = (it && typeof it === 'object' ? it : {}) as Record<string, string>
      return src ? [{ src, title: o.title, description: o.description }] : []
    }),
    ...(exp.videos ?? []).flatMap((v): MediaItem[] =>
      v.url ? [{ src: v.image || heroImage, video: v.url, title: v.title, description: v.description }] : [],
    ),
  ]
  const slotMeta = (time: string) => exp.timeSlots?.find((s) => s.time === time)
  const description = exp.fullDescription || exp.shortDescription || ''
  const duration = formatDuration(exp)

  const allSlotList: { time: string; available?: number; isAvailable: boolean }[] =
    slotData?.slots ??
    (dayIso ? exp.timeSlots : [])
      ?.filter((t) => (t as { active?: boolean }).active !== false)
      .map((t) => ({ time: t.time, isAvailable: true })) ??
    []
  // On the checkout day, slots that start after the property's checkout time are not offered.
  // ...and slots that start before the check-in time are not offered on the arrival day.
  const stayTimes = {
    arrivalDate: booking?.arrivalDate,
    checkoutDate: booking?.checkoutDate,
    checkInTime: propertySettings?.checkInTime,
    checkOutTime: propertySettings?.checkOutTime,
  }
  const slotList = allSlotList.filter(
    (s) => !slotAfterCheckout(stayTimes, dayIso, s.time, experienceMinutes(exp)) && !slotBeforeCheckin(stayTimes, dayIso, s.time),
  )
  // Places left in a slot after what's already in the cart for it (null = no count known).
  const placesLeft = (s: { time: string; available?: number }) =>
    typeof s.available === 'number' ? s.available - cart.heldOn('experience', experienceId ?? undefined, dayIso, s.time) : null
  // The guest count can't go past the places left in the chosen slot.
  const chosenSlot = slotList.find((s) => s.time === slot)
  const maxGuests = Math.max(1, Math.min(exp.groupSize?.max ?? 10, (chosenSlot && placesLeft(chosenSlot)) ?? Infinity))

  return (
    <PageShell>
    <main className="xd">
      {/* Hero */}
      <header className="xd-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="xd-hero__scrim" />
        <button className="xd__back" onClick={() => navigate('experiences-all')} aria-label="Back">
          <img src={icBack} alt="" />
        </button>
        <div className="xd-hero__text">
          <h1 className="font-display xd-hero__title">{exp.title}</h1>
          <p className="xd-hero__meta">
            {duration && (
              <span className="xd-hero__meta-item">
                <img src={icClock} alt="" />
                <span>{duration}</span>
              </span>
            )}
          </p>
        </div>
      </header>

      <MediaStrip items={media} />

      <div className="xd-body">
        <p className="xd-price">
          {unitPrice === 0 ? (
            'Complimentary'
          ) : priced.original != null ? (
            <PriceText priced={priced} unit={withTaxNote(priceUnit(expUnit(exp)))} currency={currency} />
          ) : (
            <>
              <span className="xd-price__amt">{formatPrice(priced.price, currency)}</span>
              <span className="xd-price__unit">{withTaxNote(priceUnit(expUnit(exp)))}</span>
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

        {exp.inclusions && exp.inclusions.length > 0 && (
          <section className="xd-section">
            <h2 className="font-display xd-section__title">What’s Included</h2>
            <div className="xd-chips">
              {exp.inclusions.map((inc) => (
                <span className="xd-chip" key={inc}>
                  {inc}
                  <span aria-hidden>✓</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Select Day */}
        <section className="xd-section">
          <h2 className="font-display xd-section__title">Select Day</h2>
          <div className="xd-days">
            {days.map((d) => (
              <button
                key={d.iso}
                className={`xd-day ${dayIso === d.iso ? 'xd-day--active' : ''} ${isBlocked(d.iso) ? 'xd-day--blocked' : ''}`}
                disabled={isBlocked(d.iso)}
                title={isBlocked(d.iso) ? 'Not available on this date' : undefined}
                onClick={() => { setDayIso(d.iso); setSlot('') }}
              >
                <span className="xd-day__dow">{d.dow}</span>
                <span className="xd-day__dom">{d.dom}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Select a Time */}
        <section className="xd-section">
          <h2 className="font-display xd-section__title">Select a Time</h2>
          {!dayIso && <p className="xd-error">No dates are available for this experience during your stay.</p>}
          <div className="xd-slots">
            {slotList.map((s) => {
              // Full once fewer places are left than guests (so 2 guests on a 1-place slot reads Full);
              // a count is only shown for the last place.
              const left = placesLeft(s)
              const full = !s.isAvailable || (left != null && left < guests)
              const meta = slotMeta(s.time)
              return (
                <button
                  key={s.time}
                  className={`xd-slot ${slot === s.time ? 'xd-slot--active' : ''} ${full ? 'xd-slot--full' : ''}`}
                  disabled={full}
                  onClick={() => setSlot(s.time)}
                >
                  {meta?.label?.trim() && <span className="xd-slot__label">{meta.label.trim()}</span>}
                  <span className="xd-slot__time">
                    {formatTime12(s.time)}
                    {meta?.endTime ? ` to ${formatTime12(meta.endTime)}` : ''}
                  </span>
                  <span className="xd-slot__avail">
                    {full ? 'Full' : left === 1 ? 'Only 1 slot left' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* No. of Guests */}
        {/* Group activity: the count can't be chosen, but the property's min-max is still shown when switched on. */}
        {!chooseGuests && exp.guestsEnabled !== false && guestRange && (
          <section className="xd-section xd-guests">
            <h2 className="font-display xd-section__title">No. of Guests</h2>
            <p className="xd-guests__fixed">{guestRange}</p>
          </section>
        )}
        {chooseGuests && (
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
        )}

        {/* Add-ons */}
        {exp.addOns && exp.addOns.length > 0 && (
          <section className="xd-section">
            <h2 className="font-display xd-section__title">Add-ons</h2>
            <div className="xd-addons">
              {exp.addOns.map((a) => (
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
                  <span className="xd-addon__price">+{formatPrice(a.price ?? 0, currency)} per booking</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {bookError && <p className="xd-error">{bookError}</p>}
        {note && !bookError && <p className="xd-note">{note}</p>}
      </div>

      {/* Sticky footer */}
      <BookBar
        current={slot || cart.count === 0 ? total : 0}
        currency={currency}
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
    </main>
    </PageShell>
  )
}
