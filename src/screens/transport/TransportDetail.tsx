import { useMemo, useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import BookBar from '../../components/BookBar'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useFetch } from '../../api/useFetch'
import { getGuestTransport } from '../../api/endpoints'
import { useTripCart, type NewCartItem } from '../../cart/TripCart'
import type { ApiTransportOffering, ApiVehicle } from '../../api/types'
import { formatPrice, stayDaysNights } from '../../api/format'
import { vehicleRows, priceSuffix } from './rows'
import icTransport from '../../assets/home/ic-transport.svg'
import './Transport.css'

// Car-type detail for one transport offering (Figma "Transport- full day cab" 1822:9986, "pickup and
// drop off" 946:2399, "full trip cab" 964:2694). Reached from the Transport hub via
// navigate('transport-detail', <offering slot>). Each car has its own quantity stepper (0 = not
// picked), so several car types can go in one booking; then days / city details, then book.

function dayList(arrivalIso?: string, checkoutIso?: string) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (arrivalIso) {
    const a = new Date(arrivalIso)
    a.setHours(0, 0, 0, 0)
    if (a.getTime() > start.getTime()) start.setTime(a.getTime())
  }
  const end = checkoutIso ? new Date(checkoutIso) : null
  const out: { iso: string; dow: string; dom: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (end && d.getTime() > end.getTime()) break
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dom: String(d.getDate()),
    })
  }
  return out
}

// "5" -> "up to 5 guests"; free text such as "Up to 3 guests" keeps its wording (lower-cased like Figma).
const capacityText = (c: string) => (/^\d+$/.test(c.trim()) ? `up to ${c.trim()} guests` : c.charAt(0).toLowerCase() + c.slice(1))

type PickLine = {
  vehicleId: string
  quantity: number
  days: string[]
  city: string
  pickupAddon: boolean
  amount: number // display only; the server prices the booking itself
}

// Labelled city dropdown shared by the sightseeing add-on and the pickup / full-trip details card.
function CityField({ label, cities, city, setCity, disabled }: {
  label: string
  cities: { name: string }[]
  city: string
  setCity: (c: string) => void
  disabled?: boolean
}) {
  return (
    <>
      <label className="tr-addon-card__label">{label}</label>
      <select className="tr-select" value={city} disabled={disabled} onChange={(e) => setCity(e.target.value)}>
        <option value="">Select</option>
        {cities.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
    </>
  )
}

export default function TransportDetail() {
  const { param } = useNav()
  const { guestId, booking } = useGuest()
  const { data, loading, error } = useFetch(
    () => getGuestTransport(guestId as string),
    [guestId],
    !!guestId,
  )

  const vehicles = useMemo(() => {
    const map: Record<string, ApiVehicle> = {}
    for (const v of data?.settings?.vehicles ?? []) map[v._id] = v
    return map
  }, [data])

  const offerings = useMemo(
    () => (data?.settings?.offerings ?? []).filter((o) => o.published && o.structure !== 'custom'),
    [data],
  )
  const offering: ApiTransportOffering | undefined = useMemo(() => {
    const slot = param ? Number(param) : null
    return offerings.find((o) => o.slot === slot) ?? offerings[0]
  }, [offerings, param])

  // How many of each car the guest has picked (vehicle id -> quantity); 0 / missing = not picked.
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [days, setDays] = useState<Set<string>>(new Set())
  const [city, setCity] = useState<string>('')
  const [addonOn, setAddonOn] = useState(false)
  const cart = useTripCart()
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  const stayDays = useMemo(() => dayList(booking?.arrivalDate, booking?.checkoutDate), [booking])

  // Full trip cab is priced from the plain per-day sightseeing rates and the pickup & drop-off fares (see rows.ts).
  // Those keep applying when the two tiles are switched off, so they come from ALL offerings, published or not.
  const sources = useMemo(() => (data?.settings?.offerings ?? []).filter((o) => o.structure !== 'custom'), [data])
  const sightseeing = useMemo(() => sources.find((o) => o.structure === 'daily' && !o.flatRate), [sources])
  const pickupOffering = useMemo(() => sources.find((o) => o.structure === 'p2p'), [sources])
  const vehicleOptions = useMemo(
    () => (offering ? vehicleRows(offering, vehicles, sightseeing, pickupOffering) : []),
    [offering, vehicles, sightseeing, pickupOffering],
  )
  // Nights of the stay: from the server (matches the booking), else counted from the dates.
  const stayNights = useMemo(() => {
    if (data?.nights != null) return Math.max(1, data.nights)
    if (!booking?.arrivalDate || !booking?.checkoutDate) return 1
    return Math.max(1, Math.round((new Date(booking.checkoutDate).getTime() - new Date(booking.arrivalDate).getTime()) / 86400000))
  }, [data, booking])

  const isDaily = offering?.structure === 'daily' && !offering?.flatRate
  const isFlat = offering?.structure === 'daily' && !!offering?.flatRate
  const isP2P = offering?.structure === 'p2p'
  // Full trip is charged per night of the stay.
  const tripNights = stayNights
  const perLabel = offering ? priceSuffix(offering) : ''

  // Pickup/drop cities live on the pickup offering; the sightseeing add-on and the full-trip
  // pickup both draw from it.
  const cityOptions = offering?.cities?.length ? offering.cities : (pickupOffering?.cities ?? [])
  // Sightseeing sells pickup/drop as an add-on only when the property has it switched on.
  const hasAddon = isDaily && (offering?.addons ?? []).some((slot) => offerings.some((o) => o.slot === slot))
  const needsCity = isP2P || isFlat || (hasAddon && addonOn)

  // Fare for the chosen city and car (falls back to the offering's base price when the city has none).
  const fareIn = (cityName: string, vehicleId: string) =>
    cityOptions.find((c) => c.name === cityName)?.vehiclePrices?.find((vp) => vp.vehicleId === vehicleId)?.price
  const cityFare = (vehicleId: string) => fareIn(city, vehicleId)
  // Full trip: a car with no pickup & drop-off fare from the chosen city can't be booked from there.
  const notFromHere = (vehicleId: string) => isFlat && !!city && !((cityFare(vehicleId) ?? 0) > 0)
  // Choosing another city drops any picked car that has no fare from it.
  const pickCity = (name: string) => {
    setCity(name)
    if (isFlat) setQtys((q) => Object.fromEntries(Object.entries(q).filter(([id]) => (fareIn(name, id) ?? 0) > 0 || !name)))
  }
  const addonFare = (vehicleId: string, qty: number) => (hasAddon && addonOn && city ? (cityFare(vehicleId) ?? 0) * qty : 0)
  // Pickup & drop is priced per city: "from" the lowest fare until a city is chosen, then that city's fare.
  // Full trip, once a city is chosen, is the car's net price: per-day rate x days of the stay + that city's fare.
  // Until a city is chosen the net price is from the cheapest city ("onwards"), always for every day of the stay.
  const lowestFare = (vehicleId: string) => {
    const fares = cityOptions.flatMap((c) =>
      (c.vehiclePrices ?? []).filter((vp) => vp.vehicleId === vehicleId && vp.price > 0).map((vp) => vp.price),
    )
    return fares.length ? Math.min(...fares) : 0
  }
  const transferFor = (vehicleId: string) => (city ? (cityFare(vehicleId) ?? 0) : lowestFare(vehicleId))
  const tripNet = (vehicleId: string, base: number) => base * tripNights + transferFor(vehicleId)
  const netShown = (vehicleId: string) => isFlat && (!city || cityFare(vehicleId) != null)
  const shownPrice = (vehicleId: string, base: number) =>
    isP2P ? (cityFare(vehicleId) ?? base) : netShown(vehicleId) ? tripNet(vehicleId, base) : base
  const lineAmount = (vehicleId: string, base: number, qty: number) => {
    if (isP2P) return (cityFare(vehicleId) ?? base) * qty
    // Full trip: per-day cab rate x nights of the stay, plus this city's pickup & drop-off fare per car.
    if (isFlat) return tripNet(vehicleId, base) * qty
    return base * qty * Math.max(1, days.size) + addonFare(vehicleId, qty)
  }

  const picked = vehicleOptions.filter((o) => (qtys[o.vehicle._id] ?? 0) > 0)
  const total = picked.reduce((sum, o) => sum + lineAmount(o.vehicle._id, o.price, qtys[o.vehicle._id]), 0)
  const detailsPrice = isP2P ? total : picked.reduce((sum, o) => sum + addonFare(o.vehicle._id, qtys[o.vehicle._id]), 0)

  const setQty = (vehicleId: string, qty: number) => {
    if (notFromHere(vehicleId)) return
    setQtys((q) => ({ ...q, [vehicleId]: Math.max(0, Math.min(9, qty)) }))
    setDone(false)
  }

  const toggleDay = (iso: string) =>
    setDays((prev) => {
      const next = new Set(prev)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      return next
    })

  // Validates the current picks and returns one cart line per car (or null after showing why not).
  const currentLines = (): PickLine[] | null => {
    if (picked.length === 0) return setBookError('Please choose a vehicle.'), null
    if (isDaily && days.size === 0) return setBookError('Please select at least one day.'), null
    if (needsCity && !city) return setBookError('Please choose a city.'), null
    setBookError(null)
    return picked.map((o) => ({
      vehicleId: o.vehicle._id,
      quantity: qtys[o.vehicle._id],
      days: isDaily ? [...days].sort() : [],
      city: needsCity ? city : '',
      pickupAddon: hasAddon && addonOn,
      amount: lineAmount(o.vehicle._id, o.price, qtys[o.vehicle._id]),
    }))
  }

  // This page's picks as one cart entry (one booking per service type, holding every car picked).
  const currentItem = (): NewCartItem | null => {
    const lines = currentLines()
    if (!lines || !offering) return null
    if (!guestId || !booking?.id) {
      setBookError('Booking details unavailable.')
      return null
    }
    const cars = picked.map((o) => `${o.vehicle.type || o.vehicle.name} ×${qtys[o.vehicle._id]}`).join(', ')
    const when = isDaily ? `${days.size} ${days.size === 1 ? 'day' : 'days'}` : needsCity ? city : ''
    return {
      kind: 'transport',
      title: offering.name,
      detail: [cars, when].filter(Boolean).join(' · '),
      amount: lines.reduce((sum, l) => sum + l.amount, 0),
      req: {
        guestId,
        bookingId: booking.id,
        offeringSlot: offering.slot,
        // The server re-prices these picks from the property's settings and stores them on the booking.
        items: lines.map(({ amount: _amount, ...pick }) => pick),
        // Ignored by the new backend; keeps the old one working until it is redeployed.
        amount: lines.reduce((sum, l) => sum + l.amount, 0),
      },
    }
  }

  const addToCart = () => {
    const item = currentItem()
    if (!item) return
    cart.add(item)
    setQtys({})
    setAddonOn(false)
    setNote('Added to your cart. Pick something else, or tap Book Now to book everything.')
  }

  // Book Now books whatever is picked right now together with everything already in the cart.
  const book = async () => {
    const extra = picked.length > 0 ? currentItem() : null
    if (picked.length > 0 && !extra) return
    if (!extra && cart.count === 0) return setBookError('Please choose a vehicle.')
    setBusy(true)
    setBookError(null)
    setNote(null)
    const result = await cart.checkout(extra ? [extra] : [])
    setBusy(false)
    if (result.status === 'done') {
      setDone(true)
      setQtys({})
    } else if (result.status === 'dismissed') setBookError('Payment was not completed, so nothing has been booked. Your items are still in your cart.')
    else setBookError(result.message)
  }

  // Fixed bar in place of the bottom tab bar: running total, add to cart, book.
  const actionBar =
    data && offering ? (
      <BookBar
        current={total}
        onAdd={addToCart}
        addDisabled={busy || done || picked.length === 0}
        book={{
          label: done ? 'Booked ✓' : busy ? 'Booking…' : 'Book Now',
          onClick: book,
          disabled: busy || done || (picked.length === 0 && cart.count === 0),
        }}
      />
    ) : undefined

  // Rate matrix: every city's fare for each car, so guests can compare before choosing (tap a row to pick it).
  const matrixCities = isP2P ? cityOptions.filter((c) => (c.vehiclePrices ?? []).some((vp) => vp.price > 0)) : []
  const rateMatrix = matrixCities.length > 0 && vehicleOptions.length > 0 && (
    <section className="tr-section">
      <h2 className="font-display tr-section__title">Rates by City</h2>
      <div className="tr-matrix-wrap">
        <table className="tr-matrix">
          <thead>
            <tr>
              <th scope="col">City</th>
              {vehicleOptions.map(({ vehicle }) => (
                <th scope="col" key={vehicle._id}>{vehicle.type || vehicle.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixCities.map((c) => (
              <tr key={c.name} className={c.name === city ? 'tr-matrix__on' : ''} onClick={() => pickCity(c.name)}>
                <th scope="row">{c.name}</th>
                {vehicleOptions.map(({ vehicle }) => {
                  const fare = c.vehiclePrices?.find((vp) => vp.vehicleId === vehicle._id)?.price
                  return <td key={vehicle._id}>{fare ? formatPrice(fare) : '—'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  const includes = offering?.included ?? []
  // Figma: the sightseeing page puts "Includes" right under the title (and has no description line);
  // pickup and full-trip put the description first and "Includes" after the cars.
  const includesBlock = includes.length > 0 && (
    <div className="tr-includes">
      <span className="tr-includes__label">Includes:</span>
      {includes.map((inc) => (
        <span className="tr-chip" key={inc}>{inc}<span className="tr-chip__check" aria-hidden>✓</span></span>
      ))}
    </div>
  )

  return (
    <ScreenChrome bottom={actionBar} solidTop>
      <main className="tr">
        <ScreenTitle title={offering?.name || 'Transport'} back="transport" />

        {loading && !data && <p className="tr-status">Loading…</p>}
        {error && <p className="tr-status">Couldn’t load transport options.</p>}

        {data && offering && (
          <>
            {isFlat && !!data.nights && (
              <p className="tr-nights">{stayDaysNights(data.nights)}</p>
            )}
            {!isDaily && offering.desc && <p className="tr-sub">{offering.desc}</p>}
            {isDaily && includesBlock}

            {/* Select Car Type — each car has its own quantity stepper */}
            <section className="tr-section">
              <h2 className="font-display tr-section__title">Select Car Type</h2>
              {vehicleOptions.length === 0 && (
                <p className="tr-status">No cars are priced for this service yet.</p>
              )}
              <div className="tr-cars">
                {vehicleOptions.map(({ vehicle, price }) => {
                  const qty = qtys[vehicle._id] ?? 0
                  const selected = qty > 0
                  const na = notFromHere(vehicle._id)
                  return (
                    <article className={`tr-car ${selected ? 'tr-car--selected' : ''} ${na ? 'tr-car--na' : ''}`} key={vehicle._id}>
                      <button className="tr-car__media" onClick={() => setQty(vehicle._id, selected ? 0 : 1)}>
                        {vehicle.photoUrl
                          ? <img src={vehicle.photoUrl} alt={vehicle.name} />
                          : <img className="tr-car__ph" src={icTransport} alt="" />}
                      </button>
                      <div className="tr-car__body">
                        <button className="tr-car__head" onClick={() => setQty(vehicle._id, selected ? 0 : 1)}>
                          <span className={`tr-car__check ${selected ? 'tr-car__check--on' : ''}`} aria-hidden>
                            {selected ? '✓' : ''}
                          </span>
                          <span className="tr-car__name">
                            {vehicle.type || vehicle.name}
                            <>
                              - {formatPrice(shownPrice(vehicle._id, price))}{' '}
                              {netShown(vehicle._id) ? (
                                <span className="tr-car__per">{city ? '' : 'onwards '}for {stayDaysNights(tripNights)}</span>
                              ) : (
                                perLabel && !(isP2P && city && cityFare(vehicle._id) != null) && <span className="tr-car__per">{perLabel}</span>
                              )}
                            </>
                          </span>
                        </button>
                        {na && <p className="tr-car__sub">Not available from {city}</p>}
                        <p className="tr-car__sub">
                          {vehicle.name}
                          {vehicle.capacity && (
                            <>
                              <span className="tr-car__dot" aria-hidden />
                              {capacityText(vehicle.capacity)}
                            </>
                          )}
                        </p>
                        <div className="tr-stepper" role="group" aria-label={`${vehicle.type || vehicle.name} quantity`}>
                          <button onClick={() => setQty(vehicle._id, qty - 1)} aria-label="Fewer" disabled={qty === 0 || na}>−</button>
                          <span>{qty}</span>
                          <button onClick={() => setQty(vehicle._id, qty + 1)} aria-label="More" disabled={na}>+</button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {isP2P && rateMatrix}

            {!isDaily && includesBlock}

            {isDaily && stayDays.length > 0 && (
              <section className="tr-section">
                <h2 className="font-display tr-section__title">Select Days</h2>
                <div className="tr-days">
                  {stayDays.map((d) => (
                    <button
                      key={d.iso}
                      className={`tr-day ${days.has(d.iso) ? 'tr-day--active' : ''}`}
                      onClick={() => toggleDay(d.iso)}
                    >
                      <span className="tr-day__dow">{d.dow}</span>
                      <span className="tr-day__dom">{d.dom}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {hasAddon && cityOptions.length > 0 && (
              <section className="tr-section">
                <h2 className="font-display tr-section__title">Add-ons</h2>
                <div className={`tr-addon-card ${addonOn ? 'tr-addon-card--on' : ''}`}>
                  <label className="tr-addon-card__head">
                    <input type="checkbox" checked={addonOn} onChange={(e) => setAddonOn(e.target.checked)} />
                    <span className="tr-addon-card__title">Pickup / drop off from city</span>
                  </label>
                  <p className="tr-addon-card__desc">
                    Add transfers to your sightseeing package. We will send driver and other details after booking for easy coordination.
                  </p>
                  <CityField label="Pickup and drop off point" cities={cityOptions} city={city} setCity={pickCity} disabled={!addonOn} />
                  {addonOn && detailsPrice > 0 && <p className="tr-addon-card__price">{formatPrice(detailsPrice)}</p>}
                </div>
              </section>
            )}

            {(isP2P || isFlat) && cityOptions.length > 0 && (
              <section className="tr-section">
                <h2 className="font-display tr-section__title">Details</h2>
                <div className="tr-addon-card">
                  <p className="tr-addon-card__desc">
                    We will send driver and other details after booking for easy coordination.
                  </p>
                  <CityField label="Pickup & drop off city" cities={cityOptions} city={city} setCity={pickCity} />
                  {isP2P && detailsPrice > 0 && <p className="tr-addon-card__price">{formatPrice(detailsPrice)}</p>}
                </div>
              </section>
            )}

            {bookError && <p className="tr-error">{bookError}</p>}
            {note && !bookError && <p className="tr-note">{note}</p>}
          </>
        )}
      </main>
    </ScreenChrome>
  )
}
