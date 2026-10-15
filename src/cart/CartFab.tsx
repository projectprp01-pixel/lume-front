import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNav, type Screen } from '../navigation/NavContext'
import { useTripCart } from './TripCart'
import CartSheet from './CartSheet'
import './CartFab.css'

// Floating cart button (round, bottom-right above the tab bar) shown wherever there are items in the cart,
// so checkout is one tap away from any screen. The booking pages have their own bar with the same cart link.
// It can be dragged anywhere on screen (the spot is remembered); a tap without movement opens the cart.
const HIDDEN_ON: Screen[] = [
  'experience-detail',
  'spa-detail',
  'dining-detail',
  'transport-detail',
  'inroom-cart',
  'checkin',
  'splash',
]

const SIZE = 48
const EDGE = 8
const DRAG_THRESHOLD = 6
const STORE_KEY = 'cartfab-pos'

type Pos = { x: number; y: number }

const clamp = (p: Pos): Pos => ({
  x: Math.min(Math.max(p.x, EDGE), window.innerWidth - SIZE - EDGE),
  y: Math.min(Math.max(p.y, EDGE), window.innerHeight - SIZE - EDGE),
})

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    return typeof p?.x === 'number' && typeof p?.y === 'number' ? clamp(p) : null
  } catch {
    return null
  }
}

export default function CartFab() {
  const { screen } = useNav()
  const cart = useTripCart()
  const [open, setOpen] = useState(false)
  // null = the default CSS spot (bottom-right above the tab bar) until the guest moves it.
  const [pos, setPos] = useState<Pos | null>(loadPos)
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  // Keep a moved button on screen when the window is resized / rotated.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (cart.count === 0 && !open) return null
  if (HIDDEN_ON.includes(screen) && !open) return null

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return
    d.moved = true
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }))
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    suppressClick.current = true
    setPos((p) => {
      if (p) {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(p))
        } catch {
          /* storage unavailable: the position just won't persist */
        }
      }
      return p
    })
  }
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setOpen(true)
  }

  return (
    <>
      {cart.count > 0 && !HIDDEN_ON.includes(screen) && (
        <button
          className={`cartfab ${pos ? 'cartfab--moved' : ''}`}
          style={pos ? { left: pos.x, top: pos.y } : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          aria-label={`Cart, ${cart.count} items`}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.4 8H6.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9.5" cy="19" r="1.4" fill="currentColor" />
            <circle cx="16.5" cy="19" r="1.4" fill="currentColor" />
          </svg>
          <span className="cartfab__count">{cart.count}</span>
        </button>
      )}
      {open && <CartSheet onClose={() => setOpen(false)} />}
    </>
  )
}
