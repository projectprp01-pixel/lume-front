import { Fragment, useEffect, useMemo, useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import { useNav } from '../../navigation/NavContext'
import {
  profile as staticProfile,
  bookings as staticBookings,
  type Booking,
  type GuestProfile,
} from './profileData'
import { useGuest } from '../../guest/GuestContext'
import { useFetch } from '../../api/useFetch'
import {
  getExperiences,
  getGuestDiningReservations,
  getGuestExperienceBookings,
  getGuestSpaBookings,
  getGuestTransport,
  getGuestTransportBookings,
  getRestaurants,
  getSpaFacilities,
  updateGuestContact,
} from '../../api/endpoints'
import type {
  ApiDiningReservation,
  ApiExperience,
  ApiExperienceBooking,
  ApiRestaurant,
  ApiSpaBooking,
  ApiSpaFacility,
  ApiTransportBooking,
  ApiTransportResult,
} from '../../api/types'
import { formatDayMonth, formatPrice, formatTime12 } from '../../api/format'
import icBack from '../../assets/nav/ic-back.svg'
import icDot from '../../assets/home/ic-dot.svg'
import CountryCode, { normalizeDial } from '../../components/CountryCode'
import hero from '../../assets/profile/hero.png'
import expElectricTrails from '../../assets/home/exp-electric-trails.png'
import spaFallback from '../../assets/home/ayurveda.png'
import diningFallback from '../../assets/dining/lanterns.png'
import transportFallback from '../../assets/home/ic-transport.svg'
import Footer from '../../components/Footer'
import './Profile.css'

// The booked experience's own photo: its main image, else the first gallery image.
function photoOf(e?: ApiExperience): string | undefined {
  if (!e) return undefined
  if (e.imageUrl) return e.imageUrl
  const first = e.images?.[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object') {
    const o = first as Record<string, string>
    return o.image || o.url
  }
  return undefined
}

type BookedItem = Booking & { sortKey: string }

const guestsLabel = (n?: number) => (n ? `${n} guest${n === 1 ? '' : 's'}` : '')

// A spa treatment has no photo of its own, so it shows the spa's general picture.
function spaView(b: ApiSpaBooking, facilities: ApiSpaFacility[]): BookedItem {
  const facility = facilities.find((f) => f._id === b.spaFacilityId) ?? facilities[0]
  const cancelled = b.status === 'Cancelled'
  return {
    title: b.treatmentName,
    image: facility?.listingImage || facility?.detailImage || facility?.gallery?.[0] || spaFallback,
    date: formatDayMonth(b.date),
    time: formatTime12(b.timeSlot),
    guests: guestsLabel(b.numberOfGuests),
    price: b.price ? formatPrice(b.price) : '',
    status: cancelled ? 'Cancelled' : 'Confirmed',
    note: cancelled ? `Your spa booking for ‘${b.treatmentName}’ on ${formatDayMonth(b.date)} was cancelled.` : undefined,
    sortKey: `${b.date.slice(0, 10)} ${b.timeSlot ?? ''}`,
  }
}

// A transport booking: the service it was for ("Full Trip Cab"), the cars picked, and the day. The photo is the
// first car's, else the transport page's own picture.
function transportView(b: ApiTransportBooking, transport?: ApiTransportResult | null): BookedItem {
  const offering = transport?.settings?.offerings?.find((o) => o.slot === b.offeringSlot)
  const vehicles = transport?.settings?.vehicles ?? []
  const first = b.items?.[0]
  const vehicleId = first?.vehicleId ?? b.vehicleId
  const photo = vehicles.find((v) => v._id === vehicleId)?.photoUrl || transport?.settings?.heroImage || vehicles[0]?.photoUrl
  const cars = b.items?.length
    ? b.items.map((i) => `${i.vehicleName || 'Car'}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ''}`).join(', ')
    : b.vehicleName || ''
  const day = b.days?.[0] ?? first?.days?.[0] ?? b.checkInDate
  return {
    title: offering?.name || 'Transport',
    image: photo || transportFallback,
    date: formatDayMonth(day),
    time: '',
    guests: cars,
    price: b.amount ? formatPrice(b.amount) : '',
    status: 'Confirmed',
    sortKey: `${day.slice(0, 10)} 00:00`,
  }
}

function diningView(r: ApiDiningReservation, restaurants: ApiRestaurant[]): BookedItem {
  const venue = restaurants.find((x) => x._id === r.facilityId)
  const cancelled = r.status === 'cancelled'
  return {
    title: r.facilityName,
    image: venue?.imageUrl || diningFallback,
    date: formatDayMonth(r.date),
    time: '',
    guests: guestsLabel(r.numberOfGuests),
    price: r.amount ? formatPrice(r.amount) : '',
    status: cancelled ? 'Cancelled' : r.status === 'pending' ? 'Pending' : 'Confirmed',
    note: cancelled ? `Your reservation at ${r.facilityName} on ${formatDayMonth(r.date)} was cancelled.` : undefined,
    sortKey: `${r.date.slice(0, 10)} 99:99`,
  }
}

function toBookingView(b: ApiExperienceBooking, catalog: ApiExperience[]): BookedItem {
  const cancelled = b.bookingStatus === 'cancelled'
  // The booking points at its experience (an id, or a populated {_id, title}); fall back to matching by name.
  const ref = b.experienceId && typeof b.experienceId === 'object' ? b.experienceId._id : b.experienceId
  const exp =
    catalog.find((e) => ref && e._id === ref) ??
    catalog.find((e) => e.title.trim().toLowerCase() === b.experienceName.trim().toLowerCase())
  return {
    title: b.experienceName,
    image: photoOf(exp) ?? expElectricTrails,
    date: formatDayMonth(b.date),
    time: formatTime12(b.timeSlot),
    sortKey: `${b.date.slice(0, 10)} ${b.timeSlot ?? ''}`,
    guests: `${b.numberOfGuests} guest${b.numberOfGuests === 1 ? '' : 's'}`,
    price: formatPrice(b.totalAmount ?? b.unitPrice),
    status: cancelled ? 'Cancelled' : 'Confirmed',
    note: cancelled
      ? `Your booking for ‘${b.experienceName}’ at ${formatDayMonth(b.date)}, ${b.timeSlot} was cancelled.`
      : undefined,
  }
}

// Guest profile: hero + outstanding balance, editable account details, and the
// list of experiences booked this stay. An empty booking list falls back to the
// "nothing booked" brand footer (Figma 1402:3497 / 1966:17050).
export default function Profile() {
  const { navigate } = useNav()
  const { guest, booking, guestId, refresh } = useGuest()

  const { data: catalog } = useFetch(() => getExperiences(), [])
  const { data: spaBookings } = useFetch(() => getGuestSpaBookings(guestId as string), [guestId], !!guestId)
  const { data: diningBookings } = useFetch(() => getGuestDiningReservations(guestId as string), [guestId], !!guestId)
  // The big catalogs are only fetched when there is something to show a photo for.
  const { data: spaFacilities } = useFetch(() => getSpaFacilities(), [], (spaBookings?.length ?? 0) > 0)
  const { data: restaurants } = useFetch(() => getRestaurants(), [], (diningBookings?.length ?? 0) > 0)
  const { data: transportBookings } = useFetch(() => getGuestTransportBookings(guestId as string), [guestId], !!guestId)
  const { data: transport } = useFetch(() => getGuestTransport(guestId as string), [guestId], (transportBookings?.length ?? 0) > 0)
  const { data: expBookings } = useFetch(
    () => getGuestExperienceBookings(guestId as string),
    [guestId],
    !!guestId,
  )

  const profile: GuestProfile = useMemo(() => {
    if (!guest) return staticProfile
    // The booking's rooms: the dashboard stores several as one comma-separated list.
    const rooms = (booking?.roomType || booking?.roomNumber || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
      .join(', ')
    return {
      name: guest.fullName,
      location: booking?.propertyName || staticProfile.location,
      rooms: rooms || '—',
      email: guest.email,
      phone: guest.mobileNumber || '',
    }
  }, [guest, booking])

  // Editable account details, saved with the Save button (PUT /guests/:id/contact).
  const [form, setForm] = useState({ name: '', email: '', phone: '', code: '+91' })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, phone: profile.phone, code: normalizeDial(guest?.countryCode) || '+91' })
  }, [profile.name, profile.email, profile.phone, guest?.countryCode])
  const dirty =
    form.name !== profile.name ||
    form.email !== profile.email ||
    form.phone !== profile.phone ||
    form.code !== (normalizeDial(guest?.countryCode) || '+91')
  const edit = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setNote(null)
  }
  const save = async () => {
    if (!guestId || saving) return
    const name = form.name.trim()
    const email = form.email.trim()
    if (!name) return setNote({ ok: false, text: 'Please enter your name.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setNote({ ok: false, text: 'Please enter a valid email.' })
    setSaving(true)
    setNote(null)
    try {
      await updateGuestContact(guestId, { fullName: name, email, mobileNumber: form.phone.trim(), countryCode: form.code })
      await refresh()
      setNote({ ok: true, text: 'Your details were saved.' })
    } catch (err) {
      setNote({ ok: false, text: (err as Error).message || 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const bookings: Booking[] = useMemo(() => {
    if (!guestId) return staticBookings
    // Experiences, spa treatments and dining reservations, soonest first.
    const all: BookedItem[] = [
      ...(expBookings ?? []).map((b) => toBookingView(b, catalog ?? [])),
      ...(spaBookings ?? []).map((b) => spaView(b, spaFacilities ?? [])),
      ...(diningBookings ?? []).map((r) => diningView(r, restaurants ?? [])),
      ...(transportBookings ?? []).map((t) => transportView(t, transport)),
    ]
    return all.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [guestId, expBookings, spaBookings, diningBookings, transportBookings, catalog, spaFacilities, restaurants, transport])

  return (
    <ScreenChrome>
      <main className="profile-screen">
        <header className="profile-hero" style={{ backgroundImage: `url(${hero})` }}>
          <div className="profile-hero__scrim" />
          <button
            className="profile-hero__back"
            onClick={() => navigate('home')}
            aria-label="Back"
          >
            <img src={icBack} alt="" />
          </button>
          <div className="profile-hero__text">
            <h1 className="font-display profile-hero__name">{profile.name}</h1>
            <p className="profile-hero__location">{profile.location}</p>
          </div>
        </header>

        <div className="profile-balance">
          <span className="profile-balance__label">Rooms</span>
          <span className="profile-balance__value">{profile.rooms}</span>
        </div>

        <div className="profile-body">
          <section className="profile-section">
            <h2 className="font-display profile-section__title">Account</h2>
            <div className="profile-fields">
              <label className="field">
                <span className="field__label">Name</span>
                <input className="field__input" value={form.name} onChange={(e) => edit({ name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">Email</span>
                <input className="field__input" type="email" value={form.email} onChange={(e) => edit({ email: e.target.value })} />
              </label>
              <div className="field">
                <span className="field__label">Phone Number</span>
                <div className="field__input field__input--phone">
                  <CountryCode className="phone-prefix" value={form.code} onChange={(code) => edit({ code })} />
                  <input
                    className="phone-number"
                    value={form.phone}
                    onChange={(e) => edit({ phone: e.target.value })}
                    aria-label="Phone number"
                  />
                </div>
              </div>
            </div>
            {note && (
              <p className={`profile-note ${note.ok ? 'profile-note--ok' : 'profile-note--err'}`} role="status">
                {note.text}
              </p>
            )}
            <button type="button" className="profile-save" onClick={save} disabled={!guestId || saving || !dirty}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </section>

          {bookings.length > 0 ? (
            <section className="profile-section">
              <h2 className="font-display profile-section__title">Booked This Stay</h2>
              <div className="booking-list">
                {bookings.map((b, i) => (
                  <article className="booking-card" key={`${b.title}-${i}`}>
                    <div className="booking-card__row">
                      <div className="booking-card__media">
                        <img src={b.image} alt={b.title} />
                      </div>
                      <div className="booking-card__info">
                        <h3 className="booking-card__title">{b.title}</h3>
                        <p className="booking-card__meta">
                          {[b.date, b.time, b.guests]
                            .filter(Boolean)
                            .map((part, k) => (
                              <Fragment key={k}>
                                {k > 0 && <img className="dot" src={icDot} alt="" />}
                                <span>{part}</span>
                              </Fragment>
                            ))}
                        </p>
                      </div>
                    </div>
                    <div className="booking-card__status">
                      <span className="booking-card__price">{b.price}</span>
                      <span
                        className={`status-tag status-tag--${
                          b.status === 'Confirmed' ? 'success' : b.status === 'Pending' ? 'pending' : 'error'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    {b.note && (
                      <>
                        <hr className="booking-card__divider" />
                        <p className="booking-card__note">{b.note}</p>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </ScreenChrome>
  )
}
