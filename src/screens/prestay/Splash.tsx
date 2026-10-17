import { useEffect, useState } from 'react'
import { useNav } from '../../navigation/NavContext'
import ebLogo from '../../assets/prearrival/eb-logo-splash.png'
import './Splash.css'

// App launch splash on the warm page surface (Figma Splash screen 1 → 2: the wordmark grows from 104px to 162px and fades in; the
// asset is a crop of a larger export, so it is windowed exactly like the Figma Logo layer)
// It shows briefly then auto-advances (no tap required); tapping just skips the wait.
// Every launch without a deep link starts here and continues to Home, before arrival and during the stay alike
// (the Home banner covers check-in; a shared check-in link still opens the check-in form directly).
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

  useEffect(() => {
    const t = setTimeout(() => navigate('home'), SPLASH_MS)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <button className="splash" onClick={() => navigate('home')} aria-label="Continue">
      <SplashLogo />
    </button>
  )
}
