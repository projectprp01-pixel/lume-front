import type { ReactNode } from 'react'
import MobileTopBar from './MobileTopBar'
import DesktopNav from './DesktopNav'
import './PageShell.css'

// Page frame for secondary screens that have their own bottom bar instead of the
// tab bar (in-room dining menu, cart, …): top bar + a full-height column.
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <MobileTopBar />
      <DesktopNav />
      {children}
    </div>
  )
}
