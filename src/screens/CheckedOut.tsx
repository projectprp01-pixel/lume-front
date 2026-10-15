import './CheckedOut.css'

// Shown instead of the app once the guest has passed the property's checkout time (or the checkout
// date has gone by) and opens their link.
export default function CheckedOut() {
  return (
    <main className="checked-out">
      <div className="checked-out__content">
        <span className="checked-out__leaf" aria-hidden>
          🌿
        </span>
        <h1 className="font-display checked-out__title">You have successfully checked out.</h1>
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
