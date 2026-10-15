import { useEffect, useState, type ReactNode } from 'react'
import { useFetch } from '../api/useFetch'
import { getPropertySettings } from '../api/endpoints'
import icClose from '../assets/requests/ic-close.svg'
import './InfoSheets.css'

// Quick-action popups from Home: WiFi Details (Figma 661:3645), Directory
// (661:3732) and Directions (1822:9673). All three read the live property
// settings (`wifi`, `directory`, `mapsLink` + `address`).

export type SheetKind = 'wifi' | 'directory' | 'directions'

function Sheet({
  title,
  intro,
  onClose,
  children,
}: {
  title: string
  intro?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="infosheet" role="presentation" onClick={onClose}>
      <div
        className="infosheet__card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="infosheet__head">
          <h2 className="font-display infosheet__title">{title}</h2>
          <button className="infosheet__close" onClick={onClose} aria-label="Close">
            <img src={icClose} alt="" />
          </button>
        </div>
        {intro && <p className="infosheet__intro">{intro}</p>}
        {children}
      </div>
    </div>
  )
}

const IcCopy = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden>
    <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
    <path d="M15.5 5.5v-.2a1.8 1.8 0 0 0-1.8-1.8H6.8A1.8 1.8 0 0 0 5 5.3v10.4a1.8 1.8 0 0 0 1.8 1.8h.2" />
  </svg>
)
const IcPhone = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" />
  </svg>
)
const IcExternal = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
)

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }
  return (
    <button className="wifi-row" onClick={copy}>
      <span className="wifi-row__text">
        <span className="wifi-row__label">{label}</span>
        <span className="wifi-row__value">{value}</span>
        <span className="wifi-row__hint">{copied ? 'Copied' : 'Tap to copy'}</span>
      </span>
      <span className="wifi-row__icon">
        <IcCopy />
      </span>
    </button>
  )
}

function WifiSheet({ onClose }: { onClose: () => void }) {
  const { data, loading } = useFetch(() => getPropertySettings(), [])
  const rows = (data?.wifi ?? []).filter((w) => w.network)
  return (
    <Sheet
      title="WiFi Details"
      intro="Coverage is available across most of the property but some areas near the forest edge may have limited signal."
      onClose={onClose}
    >
      {rows.length === 0 ? (
        <p className="infosheet__empty">{loading ? 'Loading…' : 'WiFi details are not available right now.'}</p>
      ) : (
        rows.map((w, i) => (
          <div className="infosheet__group" key={`${w.network}-${i}`}>
            {/* Several room types can have their own network */}
            {w.roomType && rows.length > 1 && <p className="infosheet__roomtype">{w.roomType}</p>}
            <div className="wifi-card">
              <CopyRow label="Network Name" value={w.network as string} />
              {w.password && (
                <>
                  <div className="wifi-card__rule" />
                  <CopyRow label="Password" value={w.password} />
                </>
              )}
            </div>
          </div>
        ))
      )}
      <div className="infosheet__note">
        <p className="infosheet__note-title">Having trouble connecting?</p>
        <p className="infosheet__note-body">
          Call the front desk on extension 0 or ask any member of the team.
        </p>
      </div>
    </Sheet>
  )
}

function DirectorySheet({ onClose }: { onClose: () => void }) {
  const { data, loading } = useFetch(() => getPropertySettings(), [])
  const entries = data?.directory ?? []
  const normal = entries.filter((e) => (e.style ?? 'normal') === 'normal')
  const urgent = entries.filter((e) => e.style === 'urgent')
  const whatsapp = entries.filter((e) => e.style === 'whatsapp')

  const row = (e: (typeof entries)[number], i: number) => {
    const style = e.style ?? 'normal'
    const digits = (e.phone ?? '').replace(/\D/g, '')
    const href = style === 'whatsapp' ? `https://wa.me/${digits}` : `tel:${(e.phone ?? '').replace(/\s/g, '')}`
    return (
      <div className="dir-card" key={`${e.name}-${i}`}>
        <div className="dir-card__text">
          <p className="dir-card__name">{e.name}</p>
          {e.meta && <p className="dir-card__meta">{e.meta}</p>}
        </div>
        {digits && (
          <a
            className={`dir-btn dir-btn--${style}`}
            href={href}
            {...(style === 'whatsapp' ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {style === 'whatsapp' ? 'Text' : 'Call'}
            {style !== 'whatsapp' && <IcPhone />}
          </a>
        )}
      </div>
    )
  }

  return (
    <Sheet
      title="Directory"
      intro="Reach the team any time. For non-urgent requests, the Requests tab is the fastest way to get things done."
      onClose={onClose}
    >
      {entries.length === 0 && (
        <p className="infosheet__empty">{loading ? 'Loading…' : 'The directory is not available right now.'}</p>
      )}
      {normal.length > 0 && <div className="dir-list">{normal.map(row)}</div>}
      {urgent.length > 0 && <div className="dir-list dir-list--divided">{urgent.map(row)}</div>}
      {whatsapp.length > 0 && <div className="dir-list dir-list--divided">{whatsapp.map(row)}</div>}
    </Sheet>
  )
}

function DirectionsSheet({ onClose }: { onClose: () => void }) {
  const { data, loading } = useFetch(() => getPropertySettings(), [])
  const address = (data?.address ?? '').trim()
  const query = encodeURIComponent([data?.propertyName, address.replace(/\n+/g, ', ')].filter(Boolean).join(', '))
  const openLink = data?.mapsLink || (query ? `https://www.google.com/maps/search/?api=1&query=${query}` : '')
  return (
    <Sheet title="Directions" onClose={onClose}>
      {!address && !openLink ? (
        <p className="infosheet__empty">{loading ? 'Loading…' : 'Directions are not available right now.'}</p>
      ) : (
        <>
          {query && (
            <iframe
              className="dirs-map"
              title="Map"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${query}&z=14&output=embed`}
            />
          )}
          {openLink && (
            <a className="dirs-open" href={openLink} target="_blank" rel="noreferrer">
              Click to open in Maps <IcExternal />
            </a>
          )}
          {address && (
            <div className="infosheet__note">
              <p className="infosheet__note-title infosheet__note-title--lg">Our address</p>
              <p className="infosheet__note-body dirs-address">{address}</p>
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}

export default function InfoSheet({ kind, onClose }: { kind: SheetKind; onClose: () => void }) {
  if (kind === 'wifi') return <WifiSheet onClose={onClose} />
  if (kind === 'directory') return <DirectorySheet onClose={onClose} />
  return <DirectionsSheet onClose={onClose} />
}
