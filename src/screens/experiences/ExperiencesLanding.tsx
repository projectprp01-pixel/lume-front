import ScrollRow from '../../components/ScrollRow'
import { useMemo, type ReactNode } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import Footer from '../../components/Footer'
import { useNav } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import { getExperiences, getRestaurants, getSpaFacilities } from '../../api/endpoints'
import { useAppConfig, useDiscounted } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import type { ApiExperience, ApiRestaurant } from '../../api/types'
import type { Priced } from '../../guest/AppConfig'
import { expUnit, formatPriceWithUnit, priceUnit } from '../../api/format'
import heroBg from '../../assets/home/experiences-bg.png'
import ayurvedaImg from '../../assets/home/ayurveda.png'
import culturalShow from '../../assets/experiences/exp-cultural-show.png'
import plantationTour from '../../assets/experiences/exp-plantation-tour.png'
import './ExperiencesLanding.css'

// The Experiences landing reached from the bottom-nav Experiences icon (Figma
// 336:5213) — a curated hub (hero, Book Ahead, Complimentary, Categories), as
// opposed to the flat "all experiences" grid reached from "View all".
// STUB: hero + Book Ahead + Complimentary + Categories are wired; the Ayurveda
// Centre (spa) section is still to come.

const FALLBACKS = [culturalShow, plantationTour]

type Card = {
  id: string
  image: string
  title: string
  description: string
  price: ReactNode
  popular: boolean
  free: boolean
  badge?: string
  // Where tapping the card goes (defaults to the experience detail)
  target?: 'experience' | 'spa' | 'dining'
}

function toCard(e: ApiExperience, i: number, priced?: Priced): Card {
  const base = e.pricing?.basePrice ?? 0
  return {
    id: e._id,
    image: e.imageUrl || FALLBACKS[i % FALLBACKS.length],
    title: e.title,
    description: e.shortDescription || e.fullDescription || '',
    price:
      base === 0
        ? 'Complimentary'
        : priced?.original != null
          ? <PriceText priced={priced} unit={priceUnit(expUnit(e))} currency={e.pricing?.currency} />
          : formatPriceWithUnit(base, expUnit(e), e.pricing?.currency),
    popular: !!e.isFeatured,
    free: base === 0,
  }
}

// Landing card (Figma 1787:4365): media + optional "Popular" badge, title,
// 2-line description, and the price (no time or duration on the tile).
function CardRow({ items, dark, onSelect }: { items: Card[]; dark?: boolean; onSelect: (card: Card) => void }) {
  return (
    <ScrollRow className="expl-row">
      {items.map((c, i) => (
        <article
          className={`expl-card ${dark ? 'expl-card--dark' : ''}`}
          key={c.id ?? `${c.title}-${i}`}
          onClick={() => c.id && onSelect(c)}
          style={{ cursor: 'pointer' }}
        >
          <div className="expl-card__media">
            <img src={c.image} alt={c.title} />
            {(c.badge || c.popular) && <span className="expl-card__badge">{c.badge || 'Popular'}</span>}
          </div>
          <div className="expl-card__body">
            <h3 className="font-display expl-card__title">{c.title}</h3>
            {!dark && !c.free && c.description && <p className="expl-card__desc">{c.description}</p>}
            <div className="expl-card__meta">
              <span>{c.price}</span>
            </div>
          </div>
        </article>
      ))}
    </ScrollRow>
  )
}

const VIEW_ALL_SCREEN = { experience: 'experiences-all', spa: 'spa', dining: 'dining' } as const

export default function ExperiencesLanding() {
  const { navigate } = useNav()
  const cfg = useAppConfig()
  const discounted = useDiscounted()
  const { data } = useFetch(() => getExperiences(), [])
  const { data: spa } = useFetch(() => getSpaFacilities(), [])
  const { data: restaurants } = useFetch(() => getRestaurants(), [])

  const expCard = (e: ApiExperience, i: number, badge?: string): Card => ({
    ...toCard(e, i, discounted('experience', e._id, e.pricing?.basePrice ?? 0)),
    badge,
  })

  const { bookAhead, complimentary } = useMemo(() => {
    const cards = (data ?? []).map((e, i) => expCard(e, i))
    return {
      bookAhead: cards.filter((c) => !c.free).slice(0, 6),
      complimentary: cards.filter((c) => c.free).slice(0, 6),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cfg.discounts])

  // Spa treatments as cards. `onlyId` picks one treatment (curated section); otherwise the first
  // facility's treatments — the Ayurveda Centre section that opens the landing in Figma.
  const spaCards = (onlyId?: string, imageOverride?: string): Card[] => {
    const facilities = onlyId ? (spa ?? []) : spa?.slice(0, 1) ?? []
    const out: Card[] = []
    for (const facility of facilities) {
      const fallback = facility.listingImage || ayurvedaImg
      for (const cat of facility.categories ?? []) {
        for (const t of cat.treatments ?? []) {
          if (onlyId && t._id !== onlyId) continue
          const priced = discounted('spa', t._id, t.price ?? 0)
          out.push({
            id: t._id ?? facility._id, // the treatment, so the card opens its own detail page
            image: imageOverride || t.imageUrl || t.image || fallback,
            title: t.name,
            description: t.description || '',
            price: t.price ? <PriceText priced={priced} unit={priceUnit(t.pricingLabel)} /> : 'On request',
            popular: false,
            free: false,
            target: 'spa',
          })
        }
      }
    }
    return out
  }
  const ayurveda = useMemo(() => spaCards().slice(0, 6), [spa, cfg.discounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const diningCard = (r: ApiRestaurant): Card => {
    const priced = discounted('dining', r._id, r.price ?? 0)
    return {
      id: r._id,
      image: r.imageUrl,
      title: r.name,
      // intimate dining reads what it serves (as in the dashboard preview); restaurants keep their subtitle
      description:
        r.facilityType === 'intimate_dining'
          ? (r.mealTimes ?? []).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')
          : (r.cuisine ?? []).join(', ') || r.subtitle || '',
      price: r.price ? <PriceText priced={priced} unit={priceUnit(r.pricingLabel)} /> : 'View details',
      popular: false,
      free: false,
      target: 'dining',
    }
  }

  const open = (c: Card) => {
    if (c.target === 'spa') navigate('spa-detail', c.id)
    else if (c.target === 'dining') navigate('dining-detail', c.id)
    else navigate('experience-detail', c.id)
  }

  // Sections curated in the dashboard's Guest App → Experiences tab, in the saved order.
  const sections = useMemo(() => {
    const g = cfg.guestApp
    if (!cfg.configured || !g.expSections?.length) return null
    return g.expSections
      .filter((sec) => sec.enabled !== false)
      .map((sec, i) => {
        const cards: Card[] = []
        for (const it of sec.items) {
          if (sec.sourceType === 'experience') {
            const e = data?.find((x) => x._id === it.sourceId)
            if (e) cards.push(expCard(e, cards.length, it.badge || undefined))
          } else if (sec.sourceType === 'spa') {
            for (const c of spaCards(it.sourceId, it.image)) cards.push({ ...c, badge: it.badge || undefined })
          } else {
            const r = restaurants?.find((x) => x._id === it.sourceId)
            if (r) cards.push({ ...diningCard(r), badge: it.badge || undefined })
          }
        }
        // Light/brown banding follows the saved position (Figma: light, brown, light...), so a section
        // with nothing to show right now can't shift the others into the wrong style.
        return { sec, cards, dark: i % 2 === 1 }
      })
      .filter((x) => x.cards.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, data, spa, restaurants])

  const hero = cfg.guestApp.expHero
  const heroTarget = VIEW_ALL_SCREEN[hero?.ctaTarget ?? 'experience']

  return (
    <ScreenChrome>
      <main className="expl">
        {/* Hero */}
        <section className="expl-hero" style={{ backgroundImage: `url(${hero?.image || heroBg})` }}>
          <div className="expl-hero__overlay" />
          <div className="expl-hero__content">
            <h1 className="font-display expl-hero__title">{hero?.heading || 'Experiences'}</h1>
            <p className="expl-hero__subtitle">
              {hero?.subtext || 'Everything Evolve Back has to offer, curated for your stay'}
            </p>
            <button className="expl-hero__viewall" onClick={() => navigate(heroTarget)}>
              {hero?.ctaLabel || 'View All'} →
            </button>
          </div>
        </section>

        {sections ? (
          sections.map(({ sec, cards, dark }) =>
            dark ? (
              <section className="expl-band" key={sec.id}>
                <div className="expl-band__inner">
                  <h2 className="font-display expl-band__title">{sec.heading}</h2>
                  {sec.subtext && <p className="expl-band__subtitle">{sec.subtext}</p>}
                  <CardRow items={cards} dark onSelect={open} />
                </div>
              </section>
            ) : (
              <section className="section" key={sec.id}>
                <div className="section-heading">
                  <h2 className="font-display">{sec.heading}</h2>
                  {sec.showViewAll && (
                    <button className="section-heading__action" onClick={() => navigate(VIEW_ALL_SCREEN[sec.sourceType])}>
                      View all →
                    </button>
                  )}
                </div>
                {sec.subtext && <p className="expl-band__subtitle expl-section-subtext">{sec.subtext}</p>}
                <CardRow items={cards} onSelect={open} />
              </section>
            ),
          )
        ) : (
          <>
            {ayurveda.length > 0 && (
              <section className="section">
                <div className="section-heading">
                  <h2 className="font-display">Ayurveda Centre</h2>
                  <button className="section-heading__action" onClick={() => navigate('spa')}>
                    View all →
                  </button>
                </div>
                <CardRow items={ayurveda} onSelect={open} />
              </section>
            )}

            {bookAhead.length > 0 && (
              <section className="expl-band">
                <div className="expl-band__inner">
                  <h2 className="font-display expl-band__title">Book Ahead</h2>
                  <p className="expl-band__subtitle">
                    Everything available during your stay, ready to browse and book
                  </p>
                  <CardRow items={bookAhead} dark onSelect={open} />
                </div>
              </section>
            )}

            {complimentary.length > 0 && (
              <section className="section">
                <div className="section-heading">
                  <h2 className="font-display">Complimentary</h2>
                </div>
                <CardRow items={complimentary} onSelect={open} />
              </section>
            )}
          </>
        )}

      </main>
      <Footer />
    </ScreenChrome>
  )
}
