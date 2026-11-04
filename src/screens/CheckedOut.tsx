import { useEffect, useState } from 'react'
import { getFeedbackConfig } from '../api/endpoints'
import type { ApiFeedbackConfig } from '../api/types'
import { useGuest } from '../guest/GuestContext'
import Feedback from './Feedback'
import './CheckedOut.css'

// "Maybe Later" lasts for this visit only — the rating screen comes back the next time they open the link.
const laterKey = (bookingId: string) => `lume_feedback_later_${bookingId}`

// Shown instead of the app once the guest has passed the property's checkout time (or the checkout
// date has gone by) and opens their link. A stay that hasn't been rated yet opens on the rating screen
// first; everything else (rated, skipped, or the rating service unreachable) goes straight to the message.
export default function CheckedOut() {
  const { booking } = useGuest()
  const bookingId = booking?.bookingId
  const [skipped, setSkipped] = useState(() => !!bookingId && sessionStorage.getItem(laterKey(bookingId)) === '1')
  const [thanked, setThanked] = useState(false)
  // undefined = still loading, null = couldn't load (never block the guest on it)
  const [loaded, setLoaded] = useState<ApiFeedbackConfig | null | undefined>(undefined)
  const config = bookingId ? loaded : null

  useEffect(() => {
    if (skipped || !bookingId) return
    let cancelled = false
    getFeedbackConfig(bookingId)
      .then((c) => !cancelled && setLoaded(c))
      .catch(() => !cancelled && setLoaded(null))
    return () => {
      cancelled = true
    }
  }, [bookingId, skipped])

  if (!skipped && config === undefined) return <main className="checked-out" aria-busy="true" />

  if (!skipped && !thanked && config && !config.submitted) {
    return (
      <Feedback
        config={config}
        onDone={() => setThanked(true)}
        onLater={() => {
          if (bookingId) sessionStorage.setItem(laterKey(bookingId), '1')
          setSkipped(true)
        }}
      />
    )
  }

  return (
    <main className="checked-out">
      <div className="checked-out__content">
        <span className="checked-out__leaf" aria-hidden>
          🌿
        </span>
        <h1 className="font-display checked-out__title">You have successfully checked out.</h1>
        {thanked && <p className="checked-out__text">Thank you for sharing your feedback.</p>}
        <p className="checked-out__text">
          For any further queries or assistance, please contact us at{' '}
          <a href="mailto:info@evolveback.com">info@evolveback.com</a> or call us at{' '}
          <a href="tel:+916366920434">+91 63669 20434</a>.
        </p>
        <p className="checked-out__text">Thank you.</p>
      </div>
    </main>
  )
}
