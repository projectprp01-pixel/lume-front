import { useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import Footer from '../../components/Footer'
import { useNav } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import { getPropertySettings } from '../../api/endpoints'
import icBack from '../../assets/nav/ic-back.svg'
import './About.css'

// About the property (Figma 2933:12739 web, mobile frame alongside): a hero with the property name and
// "About the property" over the photo, "Our Story", and "Property Rules" as an accordion (first one open).
// Live from Property Settings → About the Property (hero image, name, story paragraphs, house rules).
export default function About() {
  const { navigate } = useNav()
  const { data, loading } = useFetch(() => getPropertySettings(), [])
  const story = (data?.story ?? []).filter((p) => p && p.trim())
  const rules = (data?.rules ?? [])
    .map((r) => (typeof r === 'string' ? { heading: '', body: r } : r))
    .filter((r) => r.heading || r.body)
  const empty = data && !data.heroImage && !data.propertyName && story.length === 0 && rules.length === 0
  const [open, setOpen] = useState<number | null>(0)

  return (
    <ScreenChrome>
      <main className="about">
        <header className="about-hero" style={data?.heroImage ? { backgroundImage: `url(${data.heroImage})` } : undefined}>
          <div className="about-hero__scrim" />
          <button className="about-hero__back" onClick={() => navigate('home')} aria-label="Back">
            <img src={icBack} alt="" />
          </button>
          <div className="about-hero__text">
            {data?.propertyName && <p className="about-hero__eyebrow">{data.propertyName}</p>}
            <h1 className="font-display about-hero__title">About the property</h1>
          </div>
        </header>

        <div className="about-body">
          {loading && !data && <p className="about-status">Loading…</p>}
          {empty && <p className="about-status">Nothing to show here yet.</p>}

          {story.length > 0 && (
            <section className="about-section">
              <h2 className="font-display about-section__title">Our Story</h2>
              {story.map((p, i) => (
                <p className="about-story" key={i}>{p}</p>
              ))}
            </section>
          )}

          {rules.length > 0 && (
            <section className="about-section">
              <h2 className="font-display about-section__title">Property Rules</h2>
              <div className="about-rules">
                {rules.map((r, i) => {
                  const isOpen = open === i
                  return (
                    <div className="about-rule" key={i}>
                      <button
                        className="about-rule__head"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : i)}
                      >
                        <span className="about-rule__heading">{r.heading || 'Rule'}</span>
                        <svg
                          className={`about-rule__chevron ${isOpen ? 'about-rule__chevron--open' : ''}`}
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path d="M4 7.5 10 13.5 16 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isOpen && r.body && <p className="about-rule__body">{r.body}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </ScreenChrome>
  )
}
