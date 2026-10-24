import type { ApiTransportOffering, ApiVehicle } from '../../api/types'

export type VehicleRow = { vehicle: ApiVehicle; price: number }

/** Full trip cab with the property's own fixed prices (per car, pickup city and nights of the stay). */
export const isCustomFullTrip = (o?: ApiTransportOffering) => !!o?.flatRate && o.pricingMode === 'custom'

/** The fixed price for this car from this city for a stay of `nights`; undefined when none is set. */
export function customTierPrice(o: ApiTransportOffering, vehicleId: string, city: string, nights: number): number | undefined {
  const price = o.vehiclePricing
    ?.find((vp) => vp.vehicleId === vehicleId)
    ?.cities?.find((c) => c.city === city)
    ?.tiers?.find((t) => t.nights === nights)?.price
  return price && price > 0 ? price : undefined
}

/** The lowest fixed price for this car over every city that has a tier for `nights`; undefined when none. */
export function customFromPrice(o: ApiTransportOffering, vehicleId: string, nights: number): number | undefined {
  const prices = (o.vehiclePricing?.find((vp) => vp.vehicleId === vehicleId)?.cities ?? [])
    .flatMap((c) => (c.tiers ?? []).filter((t) => t.nights === nights && t.price > 0).map((t) => t.price))
  return prices.length ? Math.min(...prices) : undefined
}

// The cars an offering sells and what each costs, shared by the Transport list and detail pages.
//   - p2p (pickup & drop): fares live per city, so the rate shown is the lowest city fare for the car
//     ("from ₹X, onwards"); the exact fare is picked on the detail page once a city is chosen.
//   - daily / full trip: the offering's per-vehicle price list.
// Only vehicles the property allows on the offering (eligibleVehicles, when set) are listed.
// Full trip cab (daily + flatRate) has no prices of its own: each car it offers is charged at that car's
// per-day sightseeing rate (`rateSource`, the plain daily offering), times the days of the stay, plus the
// pickup / drop-off fare for the chosen city. A car is only listed once BOTH are set: a per-day rate on
// sightseeing and a pickup & drop-off fare in at least one city (`transferSource`, the pickup offering).
export function vehicleRows(
  o: ApiTransportOffering,
  vehicles: Record<string, ApiVehicle>,
  rateSource?: ApiTransportOffering,
  transferSource?: ApiTransportOffering,
  nights = 1,
): VehicleRow[] {
  // Custom full trip: every car the property switched on is listed; price 0 = no fixed price for this stay length
  // (the guest is sent to contact the property instead of being able to book it).
  if (isCustomFullTrip(o)) {
    return (o.vehiclePricing ?? [])
      .filter((vp) => vp.cities?.length && vehicles[vp.vehicleId])
      .map((vp) => ({ vehicle: vehicles[vp.vehicleId], price: customFromPrice(o, vp.vehicleId, nights) ?? 0 }))
  }

  const allowed = (id: string) => !o.eligibleVehicles?.length || o.eligibleVehicles.includes(id)
  const pricing = o.flatRate ? (rateSource?.vehiclePricing ?? []) : (o.vehiclePricing ?? [])

  if (o.structure === 'p2p') {
    const ids = o.eligibleVehicles?.length ? o.eligibleVehicles : Object.keys(vehicles)
    return ids
      .map((id) => {
        const cityPrices = (o.cities ?? [])
          .flatMap((c) => (c.vehiclePrices ?? []).filter((vp) => vp.vehicleId === id).map((vp) => vp.price))
          .filter((p) => p > 0)
        const base = o.vehiclePricing?.find((vp) => vp.vehicleId === id)?.price ?? 0
        return { vehicle: vehicles[id], price: cityPrices.length ? Math.min(...cityPrices) : base }
      })
      .filter((r): r is VehicleRow => !!r.vehicle && r.price > 0)
  }

  const hasTransferFare = (id: string) =>
    (transferSource?.cities ?? []).some((c) => (c.vehiclePrices ?? []).some((vp) => vp.vehicleId === id && vp.price > 0))

  return pricing
    .filter((vp) => vp.price > 0 && vehicles[vp.vehicleId] && allowed(vp.vehicleId))
    .filter((vp) => !o.flatRate || hasTransferFare(vp.vehicleId))
    .map((vp) => ({ vehicle: vehicles[vp.vehicleId], price: vp.price }))
}

/** "per day" for daily and full-trip offerings (full trip = per-day rate x nights), "onwards" for pickup & drop. */
export function priceSuffix(o: ApiTransportOffering): string {
  if (o.structure === 'p2p') return 'onwards'
  return 'per day'
}
