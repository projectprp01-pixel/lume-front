import { useEffect } from 'react'
import './MediaLightbox.css'

// Full-screen viewer for a set of photos and videos (experience / spa galleries). Opens at `index`,
// arrows (or the keyboard) step through, tapping outside or × closes. Videos play in place.
export type MediaItem = {
  /** Image URL, or the poster/thumbnail for a video. */
  src: string
  /** Playable URL — present for videos only. */
  video?: string
  title?: string
  description?: string
}

// YouTube / Vimeo links can't play in a <video> tag: they open as an embedded player instead.
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&autoplay=1`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  return null
}

export default function MediaLightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: MediaItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const item = items[index]
  const step = (d: number) => onIndex((index + d + items.length) % items.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length])

  if (!item) return null
  return (
    <div className="mlb" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="mlb__close" aria-label="Close" onClick={onClose}>×</button>
      <div className="mlb__stage" onClick={(e) => e.stopPropagation()}>
        {item.video && embedUrl(item.video) ? (
          <div className="mlb__frame">
            <iframe
              src={embedUrl(item.video) as string}
              title={item.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : item.video ? (
          <div className="mlb__frame">
            <video src={item.video} poster={item.src} controls autoPlay playsInline />
          </div>
        ) : (
          <img className="mlb__media" src={item.src} alt={item.title || ''} />
        )}
        {(item.title || item.description) && (
          <div className="mlb__caption">
            {item.title && <p className="mlb__title">{item.title}</p>}
            {item.description && <p className="mlb__desc">{item.description}</p>}
          </div>
        )}
      </div>
      {items.length > 1 && (
        <>
          <button className="mlb__nav mlb__nav--prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1) }}>‹</button>
          <button className="mlb__nav mlb__nav--next" aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1) }}>›</button>
          <p className="mlb__count">{index + 1} / {items.length}</p>
        </>
      )}
    </div>
  )
}
