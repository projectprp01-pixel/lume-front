import { useMemo, type ReactNode } from 'react'
import { useNav } from '../../navigation/NavContext'
import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import Footer from '../../components/Footer'
import {
  inRoom,
  outdoor as staticOutdoor,
  intimate as staticIntimate,
  type Restaurant,
  type IntimateExperience,
} from './diningData'
import { getRestaurants } from '../../api/endpoints'
import type { ApiRestaurant } from '../../api/types'
import { useFetch } from '../../api/useFetch'
import { useAppConfig, useDiscounted, type Priced } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import { formatPriceWithUnit } from '../../api/format'
import './Dining.css'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function mealsLabel(r: ApiRestaurant): string {
  const meals = (r.mealTimes ?? []).map(cap)
  if (meals.length === 0) return ''
  if (meals.length === 1) return meals[0]
  return `${meals.slice(0, -1).join(', ')} and ${meals[meals.length - 1]}`
}

function toOutdoor(r: ApiRestaurant): Restaurant {
  return {
    id: r._id,
    image: r.imageUrl,
    name: r.name,
    type: (r.cuisine ?? []).join(', ') || r.subtitle || 'Restaurant',
    meals: mealsLabel(r) || 'All day',
  }
}

type OutdoorItem = Restaurant
type IntimateItem = Omit<IntimateExperience, 'price' | 'hours'> & { price: ReactNode }

function toIntimate(r: ApiRestaurant, priced: Priced, image?: string): IntimateItem {
  return {
    id: r._id,
    image: image || r.imageUrl,
    name: r.name,
    price:
      priced.original != null ? (
        <PriceText priced={priced} unit={` ${r.pricingLabel?.trim() || 'per person'}`} />
      ) : (
        formatPriceWithUnit(r.price, r.pricingLabel)
      ),
  }
}

type Section =
  | { id: number; kind: 'outdoor'; heading: string; subtext: string; items: OutdoorItem[] }
  | { id: number; kind: 'intimate'; heading: string; subtext: string; items: IntimateItem[] }

export default function Dining() {
  const { navigate } = useNav()
  const cfg = useAppConfig()
  const discounted = useDiscounted()
  const { data, error } = useFetch(() => getRestaurants(), [])

  const sections = useMemo<Section[]>(() => {
    const outdoorOf = (r: ApiRestaurant, image?: string): OutdoorItem => ({ ...toOutdoor(r), image: image || r.imageUrl })
    const intimateOf = (r: ApiRestaurant, image?: string): IntimateItem =>
      toIntimate(r, discounted('dining', r._id, r.price ?? 0), image)

    if (!data) {
      return [
        { id: 1, kind: 'outdoor', heading: 'Outdoor Dining', subtext: '', items: staticOutdoor },
        { id: 2, kind: 'intimate', heading: staticIntimate.title, subtext: staticIntimate.subtitle, items: staticIntimate.items },
      ]
    }

    // Sections curated in the dashboard's Guest App → Dining tab: the first is the light "outdoor"
    // card row, the second the dark "intimate" band, matching the Figma. Items are picked by id and
    // keep the saved order; an item the property has since deactivated simply drops out.
    const curated = cfg.configured ? cfg.guestApp.diningSections : undefined
    if (curated?.length) {
      return curated
        .filter((sec) => sec.enabled !== false)
        .map((sec, i): Section => {
          const rows = sec.items
            .map((it) => ({ r: data.find((x) => x._id === it.restaurantId), image: it.imageOverride }))
            .filter((x): x is { r: ApiRestaurant; image: string | undefined } => !!x.r)
          return i % 2 === 0
            ? { id: sec.id, kind: 'outdoor', heading: sec.heading, subtext: sec.subtext ?? '', items: rows.map((x) => outdoorOf(x.r, x.image)) }
            : { id: sec.id, kind: 'intimate', heading: sec.heading, subtext: sec.subtext ?? '', items: rows.map((x) => intimateOf(x.r, x.image)) }
        })
        .filter((sec) => sec.items.length > 0)
    }

    return [
      {
        id: 1,
        kind: 'outdoor',
        heading: 'Outdoor Dining',
        subtext: '',
        items: data.filter((r) => (r.facilityType ?? 'restaurant') === 'restaurant').map((r) => outdoorOf(r)),
      },
      {
        id: 2,
        kind: 'intimate',
        heading: staticIntimate.title,
        subtext: staticIntimate.subtitle,
        items: data.filter((r) => r.facilityType === 'intimate_dining').map((r) => intimateOf(r)),
      },
    ]
  }, [data, cfg, discounted])

  // Hero: the in-room ordering banner during the stay (when the property has ordering switched on),
  // otherwise the pre-stay "Dining at ..." header. Without a saved builder document: the original banner.
  const heroCfg = cfg.guestApp.diningHero
  const showInRoom = !cfg.configured || (cfg.stage === 'instay' && cfg.inRoomOrderingEnabled)
  const hero = showInRoom
    ? {
        image: heroCfg?.instay?.image || inRoom.image,
        eyebrow: heroCfg?.instay?.eyebrow ?? inRoom.eyebrow,
        title: heroCfg?.instay?.heading || inRoom.title,
        subtext: '',
        cta: heroCfg?.instay?.ctaLabel ? `${heroCfg.instay.ctaLabel} →` : inRoom.cta,
        canOrder: true,
      }
    : {
        image: heroCfg?.prestay?.image || inRoom.image,
        eyebrow: '',
        title: heroCfg?.prestay?.heading || 'Dining',
        subtext: heroCfg?.prestay?.subtext || '',
        cta: '',
        canOrder: false,
      }

  return (
    <ScreenChrome>
      <main className="dining-screen">
        <ScreenTitle title="Dining" />

        {error && !data && (
          <p className="dining-status">Showing sample dining — couldn’t reach the server.</p>
        )}

        {/* Hero — in-room dining while staying, otherwise the pre-stay dining header */}
        <section
          className="dining-hero"
          style={{ backgroundImage: `url(${hero.image})` }}
        >
          <div className="dining-hero__overlay" />
          <div className="dining-hero__content">
            <div className="dining-hero__text">
              {hero.eyebrow && <span className="dining-hero__eyebrow">{hero.eyebrow}</span>}
              <h2 className="font-display dining-hero__title">{hero.title}</h2>
              {hero.subtext && <p className="dining-hero__eyebrow">{hero.subtext}</p>}
            </div>
            {hero.canOrder && (
              <button className="dining-hero__cta" onClick={() => navigate('dining-menus')}>
                {hero.cta}
              </button>
            )}
          </div>
        </section>

        {sections.map((sec) =>
          sec.items.length === 0 ? null : sec.kind === 'outdoor' ? (
            <section className="dining-section" key={sec.id}>
              <h2 className="font-display dining-section__title">{sec.heading}</h2>
              {sec.subtext && <p className="dining-section__subtitle">{sec.subtext}</p>}
              <div className="dining-row">
                {sec.items.map((r) => (
                  <article
                    className={`rest-card ${r.id ? 'rest-card--link' : ''}`}
                    key={r.id ?? r.name}
                    onClick={r.id ? () => navigate('dining-detail', r.id) : undefined}
                  >
                    <div className="rest-card__media">
                      <img src={r.image} alt={r.name} />
                    </div>
                    <div className="rest-card__body">
                      <h3 className="font-display rest-card__name">{r.name}</h3>
                      <p className="rest-card__meta">
                        {[r.type, r.meals].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="dining-band" key={sec.id}>
              <div className="dining-band__inner">
                <div className="dining-band__head">
                  <h2 className="font-display dining-band__title">{sec.heading}</h2>
                  {sec.subtext && <p className="dining-band__subtitle">{sec.subtext}</p>}
                </div>
                <div className="dining-row dining-row--dark">
                  {sec.items.map((item) => (
                    <article
                      className={`dine-card ${item.id ? 'dine-card--link' : ''}`}
                      key={item.id ?? item.name}
                      onClick={item.id ? () => navigate('dining-detail', item.id) : undefined}
                    >
                      <div className="dine-card__media">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className="dine-card__body">
                        <h3 className="font-display dine-card__name">{item.name}</h3>
                        <p className="dine-card__meta">
                          <span className="dine-card__price">{item.price}</span>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ),
        )}
      </main>
      <Footer />
    </ScreenChrome>
  )
}
