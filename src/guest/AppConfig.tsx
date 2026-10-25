import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useFetch } from '../api/useFetch'
import { getPropertySettings, getDiscounts } from '../api/endpoints'
import type {
  ApiDiscount,
  ApiGuestApp,
  ApiPropertySettings,
  ApiStage,
  QuickActionKey,
} from '../api/types'
import { useGuest } from './GuestContext'
import { stayPhase } from './stayPhase'
import { isCheckedIn, useNow } from './stayTimes'
import { SplashLogo } from '../screens/prestay/Splash'

// Live view of the dashboard's Guest App builder + property settings + discounts. Everything in
// here re-reads from the backend every few seconds (see api/live.ts), so flipping a toggle in the
// property dashboard shows up on the guest's screen without a reload.
//
// Until a property has saved from the builder (`guestApp` is `{}`) every toggle defaults to ON and
// curated lists fall back to the app's built-in content — so nothing disappears by accident.

export type GuestStage = 'prestay' | 'instay'

type ConfigValue = {
  /** The raw builder document (possibly `{}`), plus the rest of property settings. */
  settings: ApiPropertySettings | null
  guestApp: ApiGuestApp
  /** True once the property has saved the builder at least once. */
  configured: boolean
  stage: GuestStage
  pageEnabled: { experiences: boolean; dining: boolean; requests: boolean }
  home: {
    quickActions: boolean
    expCallout: boolean
    todaysPlan: boolean
    spotlight: boolean
    events: boolean
    gallery: boolean
  }
  /** Is this quick action turned on for the guest's current stage? */
  quickActionOn: (key: QuickActionKey) => boolean
  inRoomOrderingEnabled: boolean
  /** Does an item with this stage setting show for the guest right now? */
  showsInStage: (stage?: ApiStage) => boolean
  discounts: ApiDiscount[]
}

const ConfigContext = createContext<ConfigValue | null>(null)

const on = (v: boolean | undefined) => v !== false

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { booking, guestId } = useGuest()
  const { data: settings, error: settingsError } = useFetch(() => getPropertySettings(), [])
  const { data: discounts } = useFetch(() => getDiscounts(guestId), [guestId])

  const stage: GuestStage = stayPhase(booking?.arrivalDate, booking?.checkoutDate) === 'pre' ? 'prestay' : 'instay'

  // In-room ordering is an in-stay layer: it only appears from the property's check-in time on the arrival
  // day (not from midnight) until checkout. A guest with no arrival date on file is not gated.
  const now = useNow()
  const checkedIn =
    !booking?.arrivalDate ||
    isCheckedIn(
      {
        arrivalDate: booking.arrivalDate,
        checkoutDate: booking.checkoutDate,
        checkInTime: settings?.checkInTime,
        checkOutTime: settings?.checkOutTime,
      },
      now,
    )

  const value = useMemo<ConfigValue>(() => {
    const g: ApiGuestApp = settings?.guestApp ?? {}
    const configured = Object.keys(g).length > 0
    return {
      settings,
      guestApp: g,
      configured,
      stage,
      pageEnabled: {
        experiences: on(g.pageEnabled?.experiences),
        dining: on(g.pageEnabled?.dining),
        requests: on(g.pageEnabled?.requests),
      },
      home: {
        quickActions: on(g.homeToggles?.quickActions),
        expCallout: on(g.homeToggles?.expCallout),
        todaysPlan: on(g.homeToggles?.todaysPlan),
        spotlight: on(g.homeToggles?.spotlight),
        events: on(g.homeToggles?.events),
        gallery: on(g.homeToggles?.gallery),
      },
      quickActionOn: (key) => on(g.quickActions?.[stage]?.[key]),
      inRoomOrderingEnabled: on(g.inRoomOrderingEnabled) && checkedIn,
      showsInStage: (s) => !s || s === 'both' || s === stage,
      discounts: discounts ?? [],
    }
  }, [settings, discounts, stage, checkedIn])

  // Hold the screen until the property's saved settings arrive, so guests never see the built-in
  // sample design flash before their property's own content (an error falls through to the defaults).
  if (settings === null && !settingsError) {
    return (
      <div className="splash">
        <SplashLogo />
      </div>
    )
  }

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useAppConfig(): ConfigValue {
  const v = useContext(ConfigContext)
  if (!v) throw new Error('useAppConfig must be used inside <AppConfigProvider>')
  return v
}

// ---- Discounts --------------------------------------------------------------

export type Priced = {
  /** What the guest pays (after any discount). */
  price: number
  /** The undiscounted price, only when a discount applies. */
  original?: number
  /** Name of the applied promotion, e.g. "Weekday offer". */
  label?: string
  /** "20% off" / "₹500 off" */
  tag?: string
}

function amountOff(d: ApiDiscount, price: number): number {
  if (!(price > 0)) return 0
  let off = d.discountType === 'flat' ? d.value : (price * d.value) / 100
  if (d.discountType === 'percent' && d.maxCap) off = Math.min(off, d.maxCap)
  return Math.max(0, Math.min(Math.round(off), price))
}

// Mirrors lume-backend utils/discounts.js bestDiscountFor — the server recomputes the same thing at
// booking time, this is only for showing the guest the struck-through price.
export function priceWithDiscount(discounts: ApiDiscount[], kind: ApiDiscount['kind'], itemId: string | undefined, price: number): Priced {
  if (!itemId || !(price > 0)) return { price }
  let best: { d: ApiDiscount; off: number } | null = null
  for (const d of discounts) {
    if (d.kind !== kind || !d.itemIds.includes(itemId)) continue
    const off = amountOff(d, price)
    if (off > 0 && (!best || off > best.off)) best = { d, off }
  }
  if (!best) return { price }
  const { d, off } = best
  return {
    price: price - off,
    original: price,
    label: d.name,
    tag: d.discountType === 'percent' ? `${d.value}% off` : `₹${d.value.toLocaleString('en-IN')} off`,
  }
}

export function useDiscounted() {
  const { discounts } = useAppConfig()
  // Stable identity while the discounts are unchanged, so it's safe in memo dependency lists.
  return useCallback(
    (kind: ApiDiscount['kind'], itemId: string | undefined, price: number) =>
      priceWithDiscount(discounts, kind, itemId, price),
    [discounts],
  )
}
