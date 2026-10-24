import { useMemo } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import Footer from '../../components/Footer'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useBookingGate } from '../../guest/BookingGate'
import { useFetch } from '../../api/useFetch'
import { getGuestTransport } from '../../api/endpoints'
import type { ApiTransportOffering, ApiVehicle } from '../../api/types'
import { isCustomFullTrip, priceSuffix, vehicleRows } from './rows'
import { formatPrice } from '../../api/format'
import icBack from '../../assets/nav/ic-back.svg'
import './TransportHub.css'

// Transport hub home (Figma 1822:9930): hero + what's-included, then a card per
// service type with its per-vehicle price rows and a "Book Now" that opens the
// car-type detail; a final "Other" card routes custom requests to Write to Us.

export default function TransportHub() {
  const { navigate } = useNav()
  const gate = useBookingGate()
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

  const offerings = data?.settings?.offerings ?? []
  const serviceOfferings = offerings.filter((o) => o.published && o.structure !== 'custom')
  const custom = offerings.find((o) => o.published && o.structure === 'custom')
  const heroImage = data?.settings?.heroImage || data?.settings?.vehicles?.[0]?.photoUrl || ''

  // Card shows at most two vehicles (the rest are on the booking page).
  // Full trip is priced from the sightseeing rates and the pickup & drop-off fares, which stay in force when
  // those two tiles are switched off — so they are looked up among ALL offerings, published or not.
  const sources = offerings.filter((o) => o.structure !== 'custom')
  const sightseeing = sources.find((o) => o.structure === 'daily' && !o.flatRate)
  const pickup = sources.find((o) => o.structure === 'p2p')
  // Full trip: the preview is the net price from the cheapest pickup city — the car's per-day rate for every
  // day of the stay plus its lowest pickup & drop-off fare ("onwards"); the exact total follows the city chosen.
  const stayNights =
    data?.nights ??
    (booking?.arrivalDate && booking?.checkoutDate
      ? Math.round((new Date(booking.checkoutDate).getTime() - new Date(booking.arrivalDate).getTime()) / 86400000)
      : 1)
  const tripNights = Math.max(1, stayNights)
  const lowestTransfer = (vehicleId: string) => {
    const fares = (pickup?.cities ?? []).flatMap((c) =>
      (c.vehiclePrices ?? []).filter((vp) => vp.vehicleId === vehicleId && vp.price > 0).map((vp) => vp.price),
    )
    return fares.length ? Math.min(...fares) : 0
  }
  const rows = (o: ApiTransportOffering) =>
    vehicleRows(o, vehicles, sightseeing, pickup, tripNights)
      .filter((r) => !isCustomFullTrip(o) || r.price > 0) // custom: only cars with a fixed price for this stay
      .slice(0, 2)
      .map((r) => (o.flatRate && !isCustomFullTrip(o) ? { ...r, price: r.price * tripNights + lowestTransfer(r.vehicle._id) } : r))

  // An offering sold as an add-on to this one (e.g. pickup/drop with the sightseeing cab).
  const hasAddon = (o: ApiTransportOffering) =>
    (o.addons ?? []).some((slot) => serviceOfferings.some((x) => x.slot === slot))

  const per = (o: ApiTransportOffering) => (o.flatRate ? 'onwards' : priceSuffix(o))

  return (
    <ScreenChrome>
      <main className="th">
        {/* Hero */}
        <header className="th-hero" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
          <div className="th-hero__scrim" />
          <button className="th__back" onClick={() => navigate('home')} aria-label="Back">
            <img src={icBack} alt="" />
          </button>
          <div className="th-hero__text">
            <h1 className="font-display th-hero__title">Transport</h1>
            <p className="th-hero__sub">{data?.settings?.heroDesc || 'Dedicated vehicles with experienced drivers'}</p>
          </div>
        </header>

        {loading && !data && <p className="th-status">Loading transport…</p>}
        {error && <p className="th-status">Couldn’t load transport.</p>}

        {/* Service-type cards */}
        {serviceOfferings.map((o) => (
          <section className="th-card" key={o.slot}>
            <h2 className="th-card__title">{o.name}</h2>
            {o.desc && <p className="th-card__sub">{o.desc}</p>}
            {(rows(o).length > 0 || hasAddon(o)) && (
            <div className="th-rows">
              {rows(o).map(({ vehicle: v, price }) => (
                <div className="th-row" key={v._id}>
                  <span className="th-row__name">{v.type || v.name}{v.type && v.name ? ` (${v.name})` : ''}</span>
                  <span className="th-row__price">{formatPrice(price)} {per(o) && <span className="th-row__per">{per(o)}</span>}</span>
                </div>
              ))}
              {hasAddon(o) && (
                <div className="th-row">
                  <span className="th-row__name">Pick up/drop off</span>
                  <span className="th-row__addon">Add on option</span>
                </div>
              )}
            </div>
            )}
            <button className="th-book" onClick={() => gate(() => navigate('transport-detail', String(o.slot)))}>
              Book Now
            </button>
          </section>
        ))}

        {/* Other / custom */}
        {custom && (
          <section className="th-card">
            <h2 className="th-card__title">{custom.name || 'Other'}</h2>
            <button className="th-contact" onClick={() => navigate('requests')}>Contact Us</button>
          </section>
        )}
      </main>
      <Footer />
    </ScreenChrome>
  )
}
