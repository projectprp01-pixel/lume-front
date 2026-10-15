import footerLeafL from '../assets/home/footer-leaf-l.svg'
import footerLeafR from '../assets/home/footer-leaf-r.svg'
import './InvalidPage.css'

// Shown whenever the app is opened without a valid booking token. The guest app
// is only reachable from a personal booking link (?token=...), so there is no
// generic landing experience — an unknown/missing token is an invalid page.
export default function InvalidPage({ expired }: { expired?: boolean }) {
  return (
    <main className="invalid-page">
      <img className="invalid-page__leaf invalid-page__leaf--l" src={footerLeafL} alt="" />
      <img className="invalid-page__leaf invalid-page__leaf--r" src={footerLeafR} alt="" />
      <div className="invalid-page__content">
        <p className="font-display invalid-page__brand">Evolve Back</p>
        <h1 className="font-display invalid-page__title">
          {expired ? 'This link is no longer valid' : 'Invalid page'}
        </h1>
        <p className="invalid-page__subtitle">
          Please open the app using the personal link sent with your booking.
        </p>
      </div>
    </main>
  )
}
