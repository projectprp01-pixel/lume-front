import { useEffect, useState } from 'react'

const QUERY = '(min-width: 1024px)'

/** True on laptop-width screens (the 1024px breakpoint used by every screen's CSS). */
export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches))
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setDesktop(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}
