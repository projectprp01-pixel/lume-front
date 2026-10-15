import { useNav, type Screen } from '../navigation/NavContext'
import { useAppConfig } from '../guest/AppConfig'
import ebLogo from '../assets/home/eb-logo.png'
import icPerson from '../assets/home/ic-person.svg'
import icNotifications from '../assets/home/ic-notifications.svg'
import './nav.css'

const links: { screen: Screen; label: string }[] = [
  { screen: 'home', label: 'Home' },
  { screen: 'experiences', label: 'Experiences' },
  { screen: 'dining', label: 'Dining' },
  { screen: 'requests', label: 'Requests' },
]

// Laptop top nav — dark bar, logo left, links, icons right. Shared across all
// in-stay screens (hidden on mobile, which uses BottomNav + MobileTopBar).
export default function DesktopNav() {
  const { screen, navigate } = useNav()
  const { pageEnabled } = useAppConfig()
  const visible = links.filter((l) => l.screen === 'home' || pageEnabled[l.screen as keyof typeof pageEnabled] !== false)
  return (
    <header className="topnav topnav--desktop">
      <button className="topnav__logo-btn" onClick={() => navigate('home')} aria-label="Home">
        <img className="topnav__logo" src={ebLogo} alt="Evolve Back" />
      </button>
      <nav className="topnav__links">
        {visible.map((l) => (
          <button
            key={l.screen}
            className={`topnav__link ${screen === l.screen ? 'topnav__link--active' : ''}`}
            aria-current={screen === l.screen ? 'page' : undefined}
            onClick={() => navigate(l.screen)}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <div className="topnav__actions">
        <button
          className="topnav__icon"
          aria-label="Notifications"
          onClick={() => navigate('notifications')}
        >
          <img src={icNotifications} alt="" />
        </button>
        <button
          className="topnav__icon"
          aria-label="Profile"
          onClick={() => navigate('profile')}
        >
          <img src={icPerson} alt="" />
        </button>
      </div>
    </header>
  )
}
