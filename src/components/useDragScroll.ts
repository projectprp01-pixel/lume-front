import { useEffect, type RefObject } from 'react'

// Click-and-drag horizontal scrolling for mouse users on overflow-x rows whose
// scrollbar is hidden (touch already swipes natively). A drag past a few pixels
// swallows the click that would otherwise fire on release.
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0
    let startScroll = 0
    let dragging = false
    let moved = false

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      dragging = true
      moved = false
      startX = e.clientX
      startScroll = el.scrollLeft
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) > 5) {
        moved = true
        el.classList.add('is-dragging')
      }
      if (moved) el.scrollLeft = startScroll - dx
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      el.classList.remove('is-dragging')
    }
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    el.addEventListener('click', onClickCapture, true)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [ref])
}
