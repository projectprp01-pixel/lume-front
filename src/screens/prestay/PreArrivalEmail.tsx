import { useNav } from '../../navigation/NavContext'
import {
  email,
  reserveExperiences,
  preferences,
} from './preStayData'
import icPlane from '../../assets/prearrival/ic-plane.svg'
import icWhatsapp from '../../assets/prearrival/ic-whatsapp.svg'
import './PreArrivalEmail.css'

// The invitation email the guest receives before their check-in date — the
// entry point of the pre-stay journey. Its primary CTA opens online check-in.
// Faithful to Figma node 10:399 ("Pre-Arrival- Email").
export default function PreArrivalEmail() {
  const { navigate } = useNav()
  return (
    <main className="email">
      <header className="email__head">
        <span className="email__avatar" aria-hidden />
        <div className="email__from">
          <span className="email__sender">{email.sender}</span>
          <span className="email__to">
            To: <span>{email.recipient}</span>
          </span>
        </div>
        <span className="email__time">{email.time}</span>
      </header>
      <hr className="email__rule" />

      <div className="email__body">
        <section className="email__intro">
          <div className="email__heading">
            <p className="email__eyebrow">{email.eyebrow}</p>
            <h1 className="font-display email__title">{email.title}</h1>
            <p className="email__stay">{email.stay}</p>
          </div>
          <img className="email__hero" src={email.hero} alt="" />
          <p className="email__text">{email.intro}</p>
        </section>

        <section className="email__block">
          <div className="email__block-head">
            <h2 className="email__subhead">{email.webAppTitle}</h2>
            <p className="email__muted">{email.webAppSubtitle}</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('checkin')}>
            <img className="btn-primary__icon" src={icPlane} alt="" />
            Share your arrival details
          </button>
          <button className="btn-outline" onClick={() => navigate('checkin')}>
            Transport options
          </button>
        </section>

        <section className="email__block">
          <div className="email__block-head">
            <h2 className="email__subhead">{email.reserveTitle}</h2>
            <p className="email__muted">{email.reserveSubtitle}</p>
          </div>
          <div className="email__exp-grid">
            {reserveExperiences.map((exp) => (
              <article className="email-exp" key={exp.title}>
                <div className="email-exp__media">
                  <img src={exp.image} alt={exp.title} />
                </div>
                <div className="email-exp__text">
                  <p className="email-exp__title">{exp.title}</p>
                  <p className="email-exp__subtitle">{exp.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
          <a className="email__link" href="#" onClick={(e) => e.preventDefault()}>
            See everything available during your stay
          </a>
        </section>

        <section className="email-loyalty">
          <div className="email-loyalty__text">
            <h3 className="font-display email-loyalty__title">Loyalty Programme</h3>
            <p className="email-loyalty__sub">Get 20% off on all experiences</p>
          </div>
          <div
            className="email-loyalty__media"
            style={{ backgroundImage: `url(${email.loyaltyImage})` }}
          />
        </section>

        <section className="email__block">
          <div className="email__block-head">
            <h2 className="email__subhead">{email.prefsTitle}</h2>
            <p className="email__muted">{email.prefsSubtitle}</p>
          </div>
          <div className="email__pref-grid">
            {preferences.map((p) => (
              <button className="email-pref" key={p.label}>
                <img className="email-pref__icon" src={p.icon} alt="" />
                <span className="email-pref__label">{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="email-whatsapp">
          <img className="email-whatsapp__icon" src={icWhatsapp} alt="" />
          <div className="email-whatsapp__text">
            <p className="email-whatsapp__title">Prefer WhatsApp? Text us there</p>
            <p className="email-whatsapp__sub">
              We’ll only message when it helps your stay
            </p>
          </div>
        </section>

        <hr className="email__rule email__rule--full" />
        <footer className="email__footer">
          <span className="email__footer-logo" aria-hidden />
          <p className="email__address">
            {email.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </footer>
      </div>
    </main>
  )
}
