import { useMemo, useState, type ReactNode } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import { useNav } from '../../navigation/NavContext'
import { getExperiences } from '../../api/endpoints'
import type { ApiExperience } from '../../api/types'
import { useFetch } from '../../api/useFetch'
import { expUnit, formatDuration, formatPriceWithUnit, priceUnit } from '../../api/format'
import type { Priced } from '../../guest/AppConfig'
import { useDiscounted } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import culturalShow from '../../assets/experiences/exp-cultural-show.png'
import plantationTour from '../../assets/experiences/exp-plantation-tour.png'
import chipAll from '../../assets/experiences/chip-all.svg'
import chipNature from '../../assets/experiences/chip-nature.svg'
import chipWellness from '../../assets/experiences/chip-wellness.svg'
import './Experiences.css'

const FALLBACK_IMAGES = [culturalShow, plantationTour]

// Pick a chip icon for a free-form backend category by keyword.
function iconForCategory(category: string): string {
  const c = category.toLowerCase()
  if (/wellness|spa|yoga|ayurveda|massage/.test(c)) return chipWellness
  if (/nature|outdoor|adventure|trek|plantation|wildlife|trail/.test(c)) return chipNature
  return chipAll
}

type Tile = { id?: string; image: string; title: string; meta: ReactNode }

function toView(exp: ApiExperience, i: number, priced?: Priced): Tile {
  return {
    id: exp._id,
    image: exp.imageUrl || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
    title: exp.title,
    meta: (
      <>
        {[
          priced?.original != null
            ? <PriceText priced={priced} unit={priceUnit(expUnit(exp))} currency={exp.pricing?.currency} />
            : formatPriceWithUnit(exp.pricing?.basePrice, expUnit(exp), exp.pricing?.currency),
          formatDuration(exp),
        ]
          .filter(Boolean)
          .map((part, i) => (
            <span key={i}>{i > 0 && ' • '}{part}</span>
          ))}
      </>
    ),
  }
}

export default function Experiences() {
  const { navigate } = useNav()
  const [activeFilter, setActiveFilter] = useState('all')
  const discounted = useDiscounted()

  // Fetch the whole active catalog once; filtering is done client-side so the
  // category chips can be derived from what actually exists.
  const { data, loading, error } = useFetch(() => getExperiences(), [])

  // Derive chips from the live categories; fall back to the static chip set.
  const filters = useMemo(() => {
    if (!data || data.length === 0) return [{ key: 'all', label: 'All', icon: chipAll }]
    const cats = Array.from(new Set(data.map((e) => e.category).filter(Boolean)))
    return [
      { key: 'all', label: 'All', icon: chipAll },
      ...cats.map((c) => ({ key: c, label: c, icon: iconForCategory(c) })),
    ]
  }, [data])

  const experiences: Tile[] = useMemo(() => {
    if (!data) return []
    const filtered = activeFilter === 'all' ? data : data.filter((e) => e.category === activeFilter)
    return filtered.map((e, i) => toView(e, i, discounted('experience', e._id, e.pricing?.basePrice ?? 0)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeFilter, discounted])

  return (
    <ScreenChrome>
      <main className="experiences-screen">
        <ScreenTitle title="Experiences" back="experiences" />

        <div className="filter-chips" role="tablist" aria-label="Categories">
          {filters.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={activeFilter === f.key}
              className={`chip ${activeFilter === f.key ? 'chip--active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              <img className="chip__icon" src={f.icon} alt="" />
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {loading && !data && <p className="exp-status">Loading experiences…</p>}
        {error && !data && <p className="exp-status">Couldn’t load experiences right now.</p>}
        {data && experiences.length === 0 && <p className="exp-status">No experiences to show right now.</p>}

        <div className="exp-grid">
          {experiences.map((exp, i) => (
            <article
              className="exp-tile"
              key={exp.id ?? `${exp.title}-${i}`}
              onClick={() => exp.id && navigate('experience-detail', exp.id)}
              style={exp.id ? { cursor: 'pointer' } : undefined}
            >
              <div className="exp-tile__media">
                <img src={exp.image} alt={exp.title} />
              </div>
              <div className="exp-tile__body">
                <div className="exp-tile__head">
                  <h2 className="font-display exp-tile__title">{exp.title}</h2>
                </div>
                <span className="exp-tile__meta">{exp.meta}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </ScreenChrome>
  )
}
