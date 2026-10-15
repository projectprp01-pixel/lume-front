import { useState } from 'react'
import MediaLightbox, { type MediaItem } from './MediaLightbox'
import { useDesktop } from './useDesktop'
import './MediaStrip.css'

// Thumbnail row under a hero (Figma: three thumbs + a "+N more" tile on mobile, six + the tile on laptop). Every
// thumb opens the full-screen viewer; video thumbs carry a play badge.

export default function MediaStrip({ items }: { items: MediaItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const VISIBLE = useDesktop() ? 6 : 3
  if (items.length === 0) return null
  const shown = items.slice(0, items.length > VISIBLE ? VISIBLE : items.length)
  const more = items.length - shown.length

  return (
    <>
      <div className="mstrip">
        {shown.map((m, i) => (
          <button className="mstrip__thumb" key={i} onClick={() => setOpen(i)} aria-label={m.video ? 'Play video' : 'View photo'}>
            <img src={m.src} alt="" />
            {m.video && <span className="mstrip__play" aria-hidden>▶</span>}
          </button>
        ))}
        {more > 0 && (
          <button className="mstrip__thumb mstrip__more" onClick={() => setOpen(VISIBLE)}>
            + {more}<br />more
          </button>
        )}
      </div>
      {open != null && <MediaLightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  )
}
