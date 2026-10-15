import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import icUnfold from '../assets/profile/ic-unfold.svg'
import { COUNTRIES, countryForDial } from '../data/countries'
import './CountryCode.css'

// Country dial-code picker (flag + "+91"). Tapping the prefix opens a searchable list of every country —
// type a country name or a code ("sing", "+971", "44") — the same behaviour as the property dashboard.
// On laptop the list drops down under the prefix; on a phone it is a bottom sheet. Flags are small images
// by ISO code; where one can't load (offline) only the code shows.

// Normalise whatever is stored ("91", "+91", " +91 ") to "+91".
export function normalizeDial(code?: string | null): string {
  const digits = (code ?? '').replace(/[^\d]/g, '')
  return digits ? `+${digits}` : ''
}

export default function CountryCode({
  value,
  onChange,
  className = '',
  disabled,
}: {
  value: string
  onChange: (dial: string) => void
  className?: string
  disabled?: boolean
}) {
  const dial = normalizeDial(value) || '+91'
  // Some dial codes are shared (+1, +7, …): the country just picked stays shown, otherwise the usual one.
  const [pickedIso, setPickedIso] = useState<string | null>(null)
  const known = COUNTRIES.find((c) => c.iso === pickedIso && c.dial === dial) ?? countryForDial(dial)
  const [flagFailed, setFlagFailed] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '')
    if (!q) return COUNTRIES
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.slice(1).startsWith(q))
  }, [query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const toggle = () => {
    if (disabled) return
    if (open) return close()
    const r = trigger.current?.getBoundingClientRect()
    if (r) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 308))
      // Drop down under the prefix, or open upward when the page leaves no room below it.
      const below = window.innerHeight - r.bottom
      setPos(below < 350 && r.top > below ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span className={`cc ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="cc__btn"
        disabled={disabled}
        aria-label="Country code"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        {known && flagFailed !== known.iso && (
          <img
            className="cc__flag"
            src={`https://flagcdn.com/w40/${known.iso.toLowerCase()}.png`}
            alt=""
            onError={() => setFlagFailed(known.iso)}
          />
        )}
        <span className="cc__dial">{dial}</span>
        <img className="cc__chevron" src={icUnfold} alt="" />
      </button>

      {open &&
        createPortal(
          <>
            <div className="ccp__backdrop" onClick={close} />
            <div className="ccp" role="dialog" aria-label="Choose a country code" style={pos ? { left: pos.left, top: pos.top, bottom: pos.bottom } : undefined}>
              <input
                className="ccp__search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code…"
                aria-label="Search country or code"
              />
              <ul className="ccp__list" role="listbox">
                {list.length === 0 && <li className="ccp__empty">No country found.</li>}
                {list.map((c) => (
                  <li key={c.iso} role="option" aria-selected={c.iso === known?.iso}>
                    <button
                      type="button"
                      className={`ccp__item ${c.iso === known?.iso ? 'ccp__item--on' : ''}`}
                      onClick={() => {
                        onChange(c.dial)
                        setPickedIso(c.iso)
                        close()
                      }}
                    >
                      <span className="ccp__name">{c.name}</span>
                      <span className="ccp__dial">{c.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>,
          document.body,
        )}
    </span>
  )
}
