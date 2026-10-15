import { useMemo, useState, type ReactNode } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import NotAvailable from '../../components/NotAvailable'
import MediaStrip from '../../components/MediaStrip'
import { useNav } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import { getSpaFacilities } from '../../api/endpoints'
import type { ApiSpaFacility } from '../../api/types'
import { formatMinutes, priceUnit, spaDuration } from '../../api/format'
import { useDiscounted } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import icBack from '../../assets/nav/ic-back.svg'
import icClock from '../../assets/home/ic-clock.svg'
import icDot from '../../assets/home/ic-dot.svg'
import ayurvedaBg from '../../assets/home/ayurveda.png'
import './Spa.css'

// Ayurveda / Spa (Figma "Experiences- Spa" 1472:5196). Opened from the Home
// Ayurveda banner's "View Details". Shows the facility hero (title + subtitle), photo strip,
// underlined category tabs and a card per treatment (name, description, duration · price).

type Treatment = {
  id?: string
  category: string
  name: string
  description: string
  duration: string
  price: ReactNode
}

export default function Spa() {
  const { navigate } = useNav()
  const { data, loading, error } = useFetch(() => getSpaFacilities(), [])
  const discounted = useDiscounted()

  const facility: ApiSpaFacility | undefined = data?.[0]
  // The Spa hub is set to Hidden in the dashboard (the guest list comes back empty): the section isn't available.
  const hidden = data != null && data.length === 0
  // No built-in picture while the facility is still loading (it would flash, then swap to the real one):
  // the hero stays the plain panel colour until the property's own photo is known.
  const heroImage = !facility ? '' : facility.listingImage || facility.detailImage || facility.gallery?.[0] || ayurvedaBg

  const treatments: Treatment[] = useMemo(() => {
    if (!facility) return []
    const list: Treatment[] = []
    for (const cat of facility.categories ?? []) {
      for (const t of cat.treatments ?? []) {
        // Hidden / unavailable treatments never reach the guest app.
        if ((t as { isActive?: boolean }).isActive === false) continue
        list.push({
          id: t._id,
          category: cat.name,
          name: t.name,
          description: t.description || '',
          duration: formatMinutes(spaDuration(t)),
          price: t.price ? <PriceText priced={discounted('spa', t._id, t.price)} unit={priceUnit(t.pricingLabel)} /> : 'On request',
        })
      }
    }
    return list
  }, [facility, discounted])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(treatments.map((t) => t.category).filter(Boolean)))
    return ['All', ...cats]
  }, [treatments])

  const [active, setActive] = useState('All')
  const shown = active === 'All' ? treatments : treatments.filter((t) => t.category === active)

  // Nothing of the spa page (no stock "Ayurveda Centre" hero) shows until the property's own data is known.
  if (hidden) return <ScreenChrome><NotAvailable title="The spa isn't available right now" /></ScreenChrome>
  if (!data) {
    return (
      <ScreenChrome>
        <main className="spa">
          <p className="spa-status">{error ? 'Couldn’t load the spa menu.' : 'Loading…'}</p>
        </main>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome>
      <main className="spa">
        {/* Hero */}
        <header className="spa-hero" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
          <div className="spa-hero__scrim" />
          <button className="spa__back" onClick={() => navigate('home')} aria-label="Back">
            <img src={icBack} alt="" />
          </button>
          <div className="spa-hero__text">
            <h1 className="font-display spa-hero__title">{facility?.name || 'Ayurveda Centre'}</h1>
            {facility?.subtitle && (
              <p className="spa-hero__sub">{facility.subtitle}</p>
            )}
          </div>
        </header>

        {loading && !data && <p className="spa-status">Loading treatments…</p>}
        {error && <p className="spa-status">Couldn’t load the spa menu.</p>}

        {/* Photo strip (opens the viewer) */}
        <MediaStrip items={(facility?.gallery ?? []).map((src) => ({ src }))} />

        {/* Category tabs — underlined text, as in Figma */}
        {categories.length > 1 && (
          <div className="spa-tabs" role="tablist" aria-label="Treatment categories">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={active === c}
                className={`spa-tab ${active === c ? 'spa-tab--active' : ''}`}
                onClick={() => setActive(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Treatment cards */}
        <div className="spa-list">
          {shown.map((t, i) => (
            <article
              className="spa-card"
              key={`${t.name}-${i}`}
              role="button"
              tabIndex={0}
              onClick={() => t.id && navigate('spa-detail', t.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' && t.id) navigate('spa-detail', t.id) }}
            >
              <h3 className="font-display spa-card__title">{t.name}</h3>
              {t.description && <p className="spa-card__desc">{t.description}</p>}
              <div className="spa-card__meta">
                {t.duration && (
                  <>
                    <span className="spa-card__meta-item">
                      <img src={icClock} alt="" />
                      {t.duration}
                    </span>
                    <img className="dot" src={icDot} alt="" />
                  </>
                )}
                <span>{t.price}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </ScreenChrome>
  )
}
