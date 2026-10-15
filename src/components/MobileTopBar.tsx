import { useNav } from '../navigation/NavContext'
import icPerson from '../assets/home/ic-person.svg'
import icNotifications from '../assets/home/ic-notifications.svg'
import ebLogo from '../assets/home/eb-logo.png'
import ebLogoDark from '../assets/prearrival/eb-logo-splash.png'
import './nav.css'

// Mobile-only translucent top bar (notifications / centered logo / profile).
// Shared by Home and the in-stay tab screens (matches Figma node 1957:16862).
// `solid` is the opaque mauve bar with the dark-brown wordmark used on booking / detail pages
// (Figma "Top nav bar" 1708:5032); the default is the translucent bar that floats over a hero.
export default function MobileTopBar({ solid = false }: { solid?: boolean }) {
  const { navigate } = useNav()
  return (
    <header className={`topnav topnav--mobile ${solid ? 'topnav--solid' : ''}`}>
      <button
        className="topnav__icon"
        aria-label="Notifications"
        onClick={() => navigate('notifications')}
      >
        <img src={icNotifications} alt="" />
      </button>
      <button className="topnav__logo-btn" onClick={() => navigate('home')} aria-label="Home">
        {solid ? (
          <span className="topnav__logo-dark" role="img" aria-label="Evolve Back">
            <img src={ebLogoDark} alt="" />
          </span>
        ) : (
          <img className="topnav__logo" src={ebLogo} alt="Evolve Back" />
        )}
      </button>
      <button
        className="topnav__icon"
        aria-label="Profile"
        onClick={() => navigate('profile')}
      >
        <img src={icPerson} alt="" />
      </button>
    </header>
  )
}
