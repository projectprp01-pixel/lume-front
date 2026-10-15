import { useNav, type Screen } from '../navigation/NavContext'
import { useAppConfig } from '../guest/AppConfig'
import navHome from '../assets/nav/nav-home.svg?raw'
import navExperiences from '../assets/nav/nav-experiences.svg?raw'
import navDining from '../assets/nav/nav-dining.svg?raw'
import navRequests from '../assets/nav/nav-requests.svg?raw'
import './BottomNav.css'

// Inline the icon SVGs and swap their baked fills for currentColor so the
// active/inactive tint is driven entirely by CSS `color`.
function tint(svg: string) {
  return svg.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"')
}

// The icons are outlines (outer contour + inner contour + details). The active
// state is the solid variant: keep the outer contour and the detail shapes,
// drop the inner contour, and fill with even-odd so details read as cut-outs.
function solid(svg: string, keep: number[]) {
  return tint(svg).replace(/ d="([^"]+)"/, (_, d: string) => {
    const parts = d.split(/(?=M)/)
    return ` fill-rule="evenodd" clip-rule="evenodd" d="${keep.map((i) => parts[i]).join('')}"`
  })
}

const items: {
  screen: Screen
  label: string
  icon: string
  iconActive: string
}[] = [
  { screen: 'home', label: 'Home', icon: tint(navHome), iconActive: solid(navHome, [1]) },
  {
    screen: 'experiences',
    label: 'Experiences',
    icon: tint(navExperiences),
    iconActive: solid(navExperiences, [0, 1]),
  },
  {
    screen: 'dining',
    label: 'Dining',
    icon: tint(navDining),
    iconActive: solid(navDining, [0, 2, 3]),
  },
  {
    screen: 'requests',
    label: 'Requests',
    icon: tint(navRequests),
    iconActive: solid(navRequests, [0, 2, 3, 4]),
  },
]

// Mobile-only bottom tab bar (hidden on laptop, which uses the top nav).
export default function BottomNav() {
  const { screen, navigate } = useNav()
  const { pageEnabled } = useAppConfig()
  // Tabs the property has switched off in the dashboard disappear immediately.
  const visible = items.filter((i) => i.screen === 'home' || pageEnabled[i.screen as keyof typeof pageEnabled] !== false)
  return (
    <nav className="bottomnav" aria-label="Primary">
      {visible.map((item) => {
        // The grid ('experiences-all') keeps the Experiences tab highlighted.
        const active =
          screen === item.screen ||
          (item.screen === 'experiences' && screen === 'experiences-all')
        return (
          <button
            key={item.screen}
            className={`bottomnav__item ${active ? 'bottomnav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item.screen)}
          >
            <span
              className="bottomnav__icon"
              dangerouslySetInnerHTML={{ __html: active ? item.iconActive : item.icon }}
            />
            <span className="bottomnav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
