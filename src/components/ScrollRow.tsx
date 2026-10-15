import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './ScrollRow.css'

// A sideways-scrolling row with an arrow on each side (laptop only — touch screens swipe). Some laptops
// can't scroll a row sideways (mouse without a tilt wheel), so the arrows page it by most of a view.
// The arrows only appear in a direction that can still scroll.
export default function ScrollRow({ className, children }: { className?: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null)
  const [can, setCan] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = list.current
    if (!el) return
    setCan({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    const el = list.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [measure, children])

  const page = (dir: 1 | -1) => {
    const el = list.current
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <div className="srow">
      <div ref={list} className={className}>
        {children}
      </div>
      {can.left && (
        <button type="button" className="srow__arrow srow__arrow--left" onClick={() => page(-1)} aria-label="Scroll left">
          ‹
        </button>
      )}
      {can.right && (
        <button type="button" className="srow__arrow srow__arrow--right" onClick={() => page(1)} aria-label="Scroll right">
          ›
        </button>
      )}
    </div>
  )
}
