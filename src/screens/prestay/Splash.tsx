import { useEffect, useState } from 'react'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { useCheckInSummary } from '../../guest/checkInStatus'
import { stayPhase } from '../../guest/stayPhase'
import ebLogo from '../../assets/prearrival/eb-logo-splash.png'
import './Splash.css'

// App launch splash on the warm page surface (Figma Splash screen 1 → 2: the wordmark grows from 104px to 162px and fades in; the
// asset is a crop of a larger export, so it is windowed exactly like the Figma Logo layer)
// It shows briefly then auto-advances (no tap required); tapping just skips the wait.
// Every launch without a deep link starts here — before arrival it continues to check-in, during the stay to Home.
const SPLASH_MS = 1800

// The same logo is shown while the booking / property settings load (AppGate, AppConfigProvider), so the
// grow-and-fade animation plays only on whichever of them appears first; the next one shows it settled.
let logoAnimated = false

export function SplashLogo() {
  const [animate] = useState(() => {
    const first = !logoAnimated
    logoAnimated = true
    return first
  })
  return (
    <span className={`splash__logo ${animate ? 'splash__logo--animate' : ''}`} role="img" aria-label="Evolve Back">
      <img src={ebLogo} alt="" />
    </span>
  )
}

export default function Splash() {
  const { navigate } = useNav()
  const { booking } = useGuest()
  // Skip check-in once EVERY person on the booking has submitted (verification can still be pending).
  // Anyone missing or rejected still lands on check-in. During the stay it always goes to Home
  // (the Home banner covers check-in).
  const { allSubmitted, loading } = useCheckInSummary()
  const inStay = stayPhase(booking?.arrivalDate, booking?.checkoutDate) === 'in'
  const next = inStay || allSubmitted ? 'home' : 'checkin'

  useEffect(() => {
    if (loading && !inStay) return // wait for the answer rather than guessing a route
    const t = setTimeout(() => navigate(next), SPLASH_MS)
    return () => clearTimeout(t)
  }, [navigate, next, loading, inStay])

  return (
    <button className="splash" onClick={() => navigate(next)} aria-label="Continue">
      <SplashLogo />
    </button>
  )
}
