import { useMemo, useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import Footer from '../../components/Footer'
import { useFetch } from '../../api/useFetch'
import { getPropertySettings } from '../../api/endpoints'
import { gallery as staticGallery } from '../home/homeData'
import './Gallery.css'

// Full property photo gallery ("View all" from the Home gallery). Shows every
// uploaded image uncropped (natural aspect) in a masonry grid, with optional
// category filtering. Falls back to the sample images until the backend's
// property-settings endpoint returns the real `gallery`.

type Photo = { src: string; category: string }

export default function Gallery() {
  const { data, loading } = useFetch(() => getPropertySettings(), [])

  const photos: Photo[] = useMemo(() => {
    const real = (data?.gallery ?? []).filter((g) => g.photo)
    if (real.length > 0) return real.map((g) => ({ src: g.photo, category: g.category || '' }))
    return staticGallery.map((src) => ({ src, category: '' }))
  }, [data])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(photos.map((p) => p.category).filter(Boolean)))
    return cats.length > 0 ? ['All', ...cats] : []
  }, [photos])

  const [active, setActive] = useState('All')
  const shown = active === 'All' ? photos : photos.filter((p) => p.category === active)

  // Full-screen viewer (lightbox) — tap an image to see it uncropped, full screen.
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <ScreenChrome>
      <main className="gal">
        <ScreenTitle title="Gallery" />

        {loading && !data && <p className="gal-status">Loading gallery…</p>}

        {categories.length > 1 && (
          <div className="filter-chips gal-chips" role="tablist" aria-label="Gallery categories">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={active === c}
                className={`chip ${active === c ? 'chip--active' : ''}`}
                onClick={() => setActive(c)}
              >
                <span>{c}</span>
              </button>
            ))}
          </div>
        )}

        {/* Masonry: images keep their natural aspect ratio (uncropped) */}
        <div className="gal-masonry">
          {shown.map((p, i) => (
            <button className="gal-item" key={`${p.src}-${i}`} onClick={() => setLightbox(p.src)}>
              <img src={p.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>

      </main>
      <Footer />

      {/* Full-screen viewer */}
      {lightbox && (
        <div className="gal-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="gal-lightbox__close" aria-label="Close">×</button>
          <img className="gal-lightbox__img" src={lightbox} alt="" />
        </div>
      )}
    </ScreenChrome>
  )
}
