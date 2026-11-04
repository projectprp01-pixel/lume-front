import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { MAX_RATING, MIN_RATING, ratingAtFraction, ratingSpeech, starFill, stepRating } from './ratingMath'
import './StarRating.css'

type Props = {
  /** Current rating in half steps; 0 means nothing chosen yet. */
  value: number
  /** Fires on every change while the finger is down, so the stars fill live as it slides. */
  onChange: (value: number) => void
  /** Fires once when the finger lifts (or Enter is pressed) with the rating the guest settled on. */
  onCommit: (value: number) => void
  disabled?: boolean
}

const STARS = [0, 1, 2, 3, 4]

// Same star as the rest of the app's icons: 24px grid, drawn point-up.
function StarShape() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" focusable="false">
      <path d="M12 2.4l2.93 5.94 6.55.95-4.74 4.62 1.12 6.52L12 17.35l-5.86 3.08 1.12-6.52L2.52 9.29l6.55-.95L12 2.4z" />
    </svg>
  )
}

/**
 * Five stars that can be tapped or slid across. Pressing on a star and dragging along the row fills it
 * half a star at a time; lifting the finger commits whatever it was on.
 */
export default function StarRating({ value, onChange, onCommit, disabled = false }: Props) {
  const dragging = useRef(false)

  const ratingAt = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return ratingAtFraction(box.width > 0 ? (e.clientX - box.left) / box.width : 0)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    // Keep receiving moves even when the finger drifts above or below the row.
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    onChange(ratingAt(e))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const next = ratingAt(e)
    if (next !== value) onChange(next)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    onCommit(ratingAt(e))
  }
  // The browser took the gesture over (a scroll, a system swipe): it isn't a rating, so don't commit.
  const onPointerCancel = () => {
    dragging.current = false
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(stepRating(value, 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(stepRating(value, -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (value > 0) onCommit(value)
    }
  }

  return (
    <div
      className={`star-rating${disabled ? ' star-rating--disabled' : ''}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Overall experience"
      aria-valuemin={MIN_RATING}
      aria-valuemax={MAX_RATING}
      aria-valuenow={value > 0 ? value : undefined}
      aria-valuetext={ratingSpeech(value)}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      {STARS.map((i) => (
        <span className="star-rating__cell" key={i}>
          <span className="star-rating__star">
            <span className="star-rating__empty">
              <StarShape />
            </span>
            <span className="star-rating__filled" style={{ width: `${starFill(value, i) * 100}%` }}>
              <StarShape />
            </span>
          </span>
        </span>
      ))}
    </div>
  )
}
