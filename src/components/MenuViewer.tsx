import { useEffect, useMemo, useState } from 'react'
import icClose from '../assets/requests/ic-close.svg'
import './MenuViewer.css'

// "View Menu" popup (Figma 4075:7945 with tabs, 4075:8131 without). A facility's
// menu is a list of images, each with a label. Labels like "Page 1" / "Menu 2" are
// pages of one menu → shown with a Page n of N pager. Distinct labels ("Food",
// "Beverages", …) become tabs, one image each.

export type MenuFile = { label?: string; fileUrl?: string }

const isPdf = (url?: string) => !!url && /\.pdf(\?|#|$)/i.test(url)

const GENERIC_LABEL = /^(page|menu)?\s*\d*$/i

type Props = {
  menus: MenuFile[]
  startIndex?: number
  onClose: () => void
}

export default function MenuViewer({ menus, startIndex = 0, onClose }: Props) {
  const files = useMemo(() => menus.filter((m) => m.fileUrl), [menus])
  const asPages = files.length > 1 && files.every((m) => GENERIC_LABEL.test((m.label ?? '').trim()))
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, files.length - 1)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (asPages && e.key === 'ArrowRight') setIndex((i) => Math.min(files.length - 1, i + 1))
      else if (asPages && e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, asPages, files.length])

  const current = files[index]
  if (!current) return null

  return (
    <div className="menuviewer" role="presentation" onClick={onClose}>
      <div
        className="menuviewer__card"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menuviewer__head">
          <h2 className="font-display menuviewer__title">Menu</h2>
          <button className="menuviewer__close" onClick={onClose} aria-label="Close">
            <img src={icClose} alt="" />
          </button>
        </div>

        {!asPages && files.length > 1 && (
          <div className="menuviewer__tabs" role="tablist">
            {files.map((f, i) => (
              <button
                key={`${f.fileUrl}-${i}`}
                role="tab"
                aria-selected={i === index}
                className={`menuviewer__tab ${i === index ? 'menuviewer__tab--on' : ''}`}
                onClick={() => setIndex(i)}
              >
                {f.label?.trim() || `Menu ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="menuviewer__page">
          {isPdf(current.fileUrl) ? (
            <>
              <iframe className="menuviewer__pdf" src={current.fileUrl} title={current.label || `Menu ${index + 1}`} />
              <a className="menuviewer__open" href={current.fileUrl} target="_blank" rel="noopener noreferrer">
                Open PDF in a new tab
              </a>
            </>
          ) : (
            <img src={current.fileUrl} alt={current.label || `Menu page ${index + 1}`} />
          )}
        </div>

        {asPages && (
          <div className="menuviewer__pager">
            <button
              className="menuviewer__arrow"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label="Previous page"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="menuviewer__count">
              Page {index + 1} of {files.length}
            </span>
            <button
              className="menuviewer__arrow"
              onClick={() => setIndex((i) => Math.min(files.length - 1, i + 1))}
              disabled={index === files.length - 1}
              aria-label="Next page"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
