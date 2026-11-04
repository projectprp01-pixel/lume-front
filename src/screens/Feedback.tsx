import { useState } from 'react'
import { submitFeedback } from '../api/endpoints'
import type { ApiFeedbackConfig } from '../api/types'
import StarRating from '../components/StarRating'
import { ratingLabel } from '../components/ratingMath'
import { useGuest } from '../guest/GuestContext'
import './Feedback.css'

type Props = {
  config: ApiFeedbackConfig
  /** "Maybe Later": leave without rating, for now. */
  onLater: () => void
  /** The rating is saved and there is nowhere to send the guest — carry on to the checked-out message. */
  onDone: () => void
}

type Phase = 'idle' | 'saving' | 'redirecting'

// The link comes from the property's dashboard; only ever follow plain web links.
function safeUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

/**
 * "Before you go" — shown once the guest has checked out. They tap or slide across the stars (half-star
 * steps). At or below the property's threshold they are asked how the stay could have been better; above
 * it the rating is saved the moment they lift their finger and they are sent to the review site the
 * property has switched on.
 */
export default function Feedback({ config, onLater, onDone }: Props) {
  const { guest, booking } = useGuest()
  // What the stars show right now (follows the finger) vs. the rating the guest last settled on.
  const [value, setValue] = useState(0)
  const [committed, setCommitted] = useState(0)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [site, setSite] = useState<{ name: string; url: string } | null>(null)

  const bookingId = booking?.bookingId
  const firstName = (guest?.fullName ?? booking?.primaryGuestName ?? '').trim().split(/\s+/)[0]
  const property = booking?.propertyName
  const busy = phase !== 'idle'
  const askWhy = committed > 0 && committed <= config.lowMax

  async function save(rating: number, response: string) {
    if (!bookingId) {
      setError("We couldn't find your booking. Please try again.")
      return
    }
    setPhase('saving')
    setError('')
    try {
      const res = await submitFeedback({ bookingId, rating, response })
      // Only a freshly saved rating redirects; one that was already there (double tap, another device) doesn't.
      const url = res.created ? safeUrl(res.reviewSite?.url) : null
      if (url && res.reviewSite) {
        setSite({ name: res.reviewSite.name, url })
        setPhase('redirecting')
        window.location.assign(url)
        return
      }
      onDone()
    } catch {
      setPhase('idle')
      setError("We couldn't save your rating. Please try again.")
    }
  }

  // The finger lifted on `rating`.
  function commit(rating: number) {
    if (busy) return
    setValue(rating)
    setCommitted(rating)
    setError('')
    // Above the threshold there is nothing more to ask: save it now. At or below, wait for the answer.
    if (rating > config.lowMax) void save(rating, '')
  }

  const status =
    phase === 'saving'
      ? 'Saving your rating…'
      : phase === 'redirecting'
        ? ''
        : ratingLabel(value)

  return (
    <main className="feedback">
      <div className="feedback__body">
        <span className="feedback__icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
            <path d="M12 21s-7.5-4.6-9.5-9.2C1.3 8.9 3 5.5 6.4 5.5c2 0 3.5 1.1 4.6 2.7h2c1.1-1.6 2.6-2.7 4.6-2.7 3.4 0 5.1 3.4 3.9 6.3C19.5 16.4 12 21 12 21z" />
          </svg>
        </span>

        <h1 className="font-display feedback__title">{firstName ? `Before you go, ${firstName}` : 'Before you go'}</h1>
        <p className="feedback__subtitle">
          {property ? `We'd love to know how your stay at ${property} was.` : "We'd love to know how your stay was."}
        </p>

        {phase === 'redirecting' && site ? (
          <div className="feedback__redirect" role="status">
            <p className="feedback__thanks">Thank you!</p>
            <p className="feedback__hint">Taking you to {site.name}, where you can share it in your own words.</p>
            <a className="feedback__link" href={site.url}>
              Continue to {site.name}
            </a>
          </div>
        ) : (
          <>
            <p className="feedback__label">Overall Experience</p>
            <StarRating value={value} onChange={setValue} onCommit={commit} disabled={busy} />
            <p className="feedback__rating-word" aria-live="polite">
              {status}
            </p>

            {askWhy && (
              <div className="feedback__ask">
                <label className="feedback__prompt" htmlFor="feedback-answer">
                  {config.prompt}
                </label>
                <textarea
                  id="feedback-answer"
                  className="feedback__textarea"
                  value={answer}
                  maxLength={1000}
                  disabled={busy}
                  placeholder="Your answer is shared privately with our team."
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <button type="button" className="feedback__submit" disabled={busy} onClick={() => void save(committed, answer)}>
                  {phase === 'saving' ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            )}

            {error && (
              <p className="feedback__error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {phase !== 'redirecting' && (
        <button type="button" className="feedback__later" disabled={busy} onClick={onLater}>
          Maybe Later
        </button>
      )}
    </main>
  )
}
