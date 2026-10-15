import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// The in-stay guest app is a small set of top-level tabs. We keep navigation
// lightweight (no router dependency) — a single screen key in context that the
// shared nav components read and set.
// Bottom-nav tabs plus the top-bar destinations (profile, notifications) which
// are reachable from every screen but are not tabs themselves.
export type Screen =
  | 'home'
  | 'experiences'
  // The full "all experiences" grid, reached from "View all" (distinct from the
  // Experiences landing that the bottom-nav icon opens).
  | 'experiences-all'
  // A single experience's detail page; the experience id is passed as the nav param.
  | 'experience-detail'
  | 'dining'
  // An intimate-dining facility's detail + booking page; the facility id is the nav param.
  | 'dining-detail'
  // In-room dining: menu (param = optional meal/category id), cart + checkout, and the
  // listing of menus by meal.
  | 'inroom-dining'
  | 'inroom-cart'
  | 'dining-menus'
  | 'requests'
  | 'profile'
  | 'notifications'
  // Quick-action / banner destinations from Home
  | 'transport'
  // A single transport offering's car-type detail; the offering slot is the nav param.
  | 'transport-detail'
  | 'spa'
  // A spa treatment's booking page; the treatment id is the nav param.
  | 'spa-detail'
  // Full property photo gallery ("View all" from the Home gallery)
  | 'gallery'
  // Property facilities list (quick action on Home)
  | 'facilities'
  // About the property (hero link on Home)
  | 'about'
  // A home-page event's details; the event id is the nav param.
  | 'event-detail'
  // Pre-stay (before the check-in date): the online check-in flow. The
  // invitation email is a reference for what the guest receives by email and is
  // intentionally NOT a screen in the app. In-stay screens live above.
  | 'splash'
  | 'checkin'

type NavValue = {
  screen: Screen
  // Optional payload for the destination (e.g. the experience id for detail pages).
  param: string | null
  navigate: (screen: Screen, param?: string) => void
}

const NavContext = createContext<NavValue | null>(null)

const screens: Screen[] = [
  'home',
  'experiences',
  'experiences-all',
  'dining',
  'dining-detail',
  'inroom-dining',
  'inroom-cart',
  'dining-menus',
  'requests',
  'experience-detail',
  'profile',
  'notifications',
  'transport',
  'transport-detail',
  'spa',
  'spa-detail',
  'gallery',
  'facilities',
  'about',
  'event-detail',
  'splash',
  'checkin',
]

// Read the initial tab from the URL hash (e.g. #/dining) so screens are
// deep-linkable and reloads keep their place. With no (or an unknown) hash we
// fall back to `defaultScreen`, which the date-based gate sets per stay phase
// ('splash' before arrival, 'home' during the stay).
function screenFromHash(defaultScreen: Screen): Screen {
  const key = window.location.hash.replace(/^#\/?/, '')
  return (screens as string[]).includes(key) ? (key as Screen) : defaultScreen
}

export function NavProvider({
  children,
  defaultScreen = 'home',
}: {
  children: ReactNode
  defaultScreen?: Screen
}) {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash(defaultScreen))
  const [param, setParam] = useState<string | null>(null)

  const navigate = (next: Screen, nextParam?: string) => {
    setParam(nextParam ?? null)
    setScreen(next)
    window.location.hash = next === defaultScreen ? '' : `/${next}`
    // jump back to the top when switching tabs, like a native tab change
    window.scrollTo({ top: 0 })
  }

  // Keep the view in sync with the URL hash (browser back/forward, deep links).
  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash(defaultScreen))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [defaultScreen])

  return (
    <NavContext.Provider value={{ screen, param, navigate }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
