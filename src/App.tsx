import { useEffect } from 'react'
import { NavProvider, useNav, type Screen } from './navigation/NavContext'
import { GuestProvider, useGuest } from './guest/GuestContext'
import { AppConfigProvider, useAppConfig } from './guest/AppConfig'
import { stayPhase } from './guest/stayPhase'
import Home from './screens/home/Home'
import ExperiencesLanding from './screens/experiences/ExperiencesLanding'
import Experiences from './screens/experiences/Experiences'
import EventDetail from './screens/about/EventDetail'
import About from'./screens/about/About'
import SpaDetail from './screens/spa/SpaDetail'
import ExperienceDetail from './screens/experiences/ExperienceDetail'
import TransportHub from './screens/transport/TransportHub'
import TransportDetail from './screens/transport/TransportDetail'
import Spa from './screens/spa/Spa'
import Gallery from './screens/gallery/Gallery'
import Facilities from './screens/facilities/Facilities'
import Dining from './screens/dining/Dining'
import DiningDetail from './screens/dining/DiningDetail'
import InRoomDining from './screens/dining/InRoomDining'
import InRoomCart from './screens/dining/InRoomCart'
import DiningMenus from './screens/dining/DiningMenus'
import { CartProvider } from './screens/dining/CartContext'
import { TripCartProvider } from './cart/TripCart'
import CartFab from './cart/CartFab'
import Requests from './screens/requests/Requests'
import Profile from './screens/profile/Profile'
import Notifications from './screens/notifications/Notifications'
import Splash, { SplashLogo } from './screens/prestay/Splash'
import CheckIn from './screens/prestay/CheckIn'
import InvalidPage from './screens/InvalidPage'
import CheckedOut from './screens/CheckedOut'
import { BookingGateProvider } from './guest/BookingGate'
import { isCheckedOut, useNow } from './guest/stayTimes'

// Tabs the property can switch off from the dashboard (Guest App → page toggles). A switched-off
// section's landing pages fall back to Home, so a stale link or open tab can't reach it.
const SECTION_OF: Partial<Record<Screen, 'experiences' | 'dining' | 'requests'>> = {
  experiences: 'experiences',
  'experiences-all': 'experiences',
  dining: 'dining',
  requests: 'requests',
}

function CurrentScreen() {
  const { screen, navigate } = useNav()
  const { pageEnabled, inRoomOrderingEnabled } = useAppConfig()
  const section = SECTION_OF[screen]
  const blocked =
    (section && !pageEnabled[section]) ||
    ((screen === 'inroom-dining' || screen === 'inroom-cart' || screen === 'dining-menus') && !inRoomOrderingEnabled)
  useEffect(() => {
    if (blocked) navigate('home')
  }, [blocked, navigate])
  if (blocked) return null
  switch (screen) {
    case 'experiences':
      return <ExperiencesLanding />
    case 'experiences-all':
      return <Experiences />
    case 'experience-detail':
      return <ExperienceDetail />
    case 'transport':
      return <TransportHub />
    case 'transport-detail':
      return <TransportDetail />
    case 'spa':
      return <Spa />
    case 'spa-detail':
      return <SpaDetail />
    case 'event-detail':
      return <EventDetail />
    case 'about':
      return <About />
    case 'gallery':
      return <Gallery />
    case 'facilities':
      return <Facilities />
    case 'dining':
      return <Dining />
    case 'dining-detail':
      return <DiningDetail />
    case 'inroom-dining':
      return <InRoomDining />
    case 'inroom-cart':
      return <InRoomCart />
    case 'dining-menus':
      return <DiningMenus />
    case 'requests':
      return <Requests />
    case 'profile':
      return <Profile />
    case 'notifications':
      return <Notifications />
    case 'splash':
      return <Splash />
    case 'checkin':
      return <CheckIn />
    default:
      return <Home />
  }
}

// Past the checkout time (settings, "HH:MM") on the checkout day the guest sees the checked-out message instead of the app.
function StayGate() {
  const { booking } = useGuest()
  const { settings } = useAppConfig()
  const now = useNow()
  if (isCheckedOut({ checkoutDate: booking?.checkoutDate, checkOutTime: settings?.checkOutTime }, now)) return <CheckedOut />
  return (
    <BookingGateProvider>
      <CurrentScreen />
      <CartFab />
    </BookingGateProvider>
  )
}

// The guest app is only reachable from a personal booking link that carries a
// token. Gate everything behind a resolved token, then route by stay phase:
// pre-stay → online check-in flow, in-stay → the tabs, post-checkout → expired.
function AppGate() {
  const { status, booking } = useGuest()

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <div className="splash">
          <SplashLogo />
        </div>
      </div>
    )
  }

  if (status === 'no-token') return <InvalidPage />
  if (status === 'error') return <InvalidPage expired />

  const phase = stayPhase(booking?.arrivalDate, booking?.checkoutDate)
  if (phase === 'post') return <CheckedOut />

  // Every launch (no deep link) opens on the splash: pre-stay continues to check-in, in-stay to Home.
  const defaultScreen = 'splash'

  return (
    <NavProvider defaultScreen={defaultScreen}>
      <div className="app-shell">
        <AppConfigProvider>
          <CartProvider>
            <TripCartProvider>
              <StayGate />
            </TripCartProvider>
          </CartProvider>
        </AppConfigProvider>
      </div>
    </NavProvider>
  )
}

function App() {
  return (
    <GuestProvider>
      <AppGate />
    </GuestProvider>
  )
}

export default App
