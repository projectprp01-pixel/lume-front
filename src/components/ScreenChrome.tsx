import type { ReactNode } from 'react'
import DesktopNav from './DesktopNav'
import MobileTopBar from './MobileTopBar'
import BottomNav from './BottomNav'
import './ScreenChrome.css'

// Shared page shell for the in-stay tab screens: translucent top bar on mobile,
// dark link bar on laptop, and a bottom tab bar on mobile. Screens supply the
// scrollable content between them. `bottom` swaps the tab bar for a screen-specific action bar
// (e.g. total + Book Now on booking pages).
export default function ScreenChrome({ children, bottom, solidTop }: { children: ReactNode; bottom?: ReactNode; solidTop?: boolean }) {
  return (
    <div className="screen-shell">
      <MobileTopBar solid={solidTop} />
      <DesktopNav />
      {children}
      {bottom ?? <BottomNav />}
    </div>
  )
}
