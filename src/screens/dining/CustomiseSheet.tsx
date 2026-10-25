import { useEffect, useState } from 'react'
import type { ApiFbDish, ApiFbExtra } from '../../api/types'
import { formatRupees } from '../../api/format'
import icCancel from '../../assets/inroom/ic-cancel.svg'
import icCheckOn from '../../assets/inroom/ic-check-on.svg'
import './CustomiseSheet.css'

// "Customise" popup shown when a guest adds a dish that has extras (Figma "Add bottom sheet" 1275:9704 on
// mobile, "Add Item" 2800:20756 on laptop). Ticks the extras they want, then "Add Item" puts the dish in
// the cart with those extras on its line.
export default function CustomiseSheet({
  dish,
  onClose,
  onAdd,
}: {
  dish: ApiFbDish
  onClose: () => void
  onAdd: (extras: ApiFbExtra[]) => void
}) {
  const extras = dish.extras ?? []
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <div className="csheet" role="presentation" onClick={onClose}>
      <div
        className="csheet__card"
        role="dialog"
        aria-modal="true"
        aria-label={`Customise ${dish.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csheet__body">
          <div className="csheet__head">
            <h2 className="font-display csheet__title">Customise</h2>
            <button className="csheet__close" onClick={onClose} aria-label="Close">
              <img src={icCancel} alt="" />
            </button>
          </div>

          <div className="csheet__group">
            <p className="csheet__label">Extras</p>
            <ul className="csheet__list">
              {extras.map((x) => {
                const on = picked.has(x.name)
                return (
                  <li key={x.name}>
                    <button
                      type="button"
                      className="csheet__row"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(x.name)}
                    >
                      <span className="csheet__text">
                        <span className="csheet__name">{x.name}</span>
                        {x.note && <span className="csheet__note">{x.note}</span>}
                      </span>
                      <span className="csheet__side">
                        <span className="csheet__price">+ {formatRupees(x.price || 0)}</span>
                        {on ? <img className="csheet__box" src={icCheckOn} alt="" /> : <span className="csheet__box csheet__box--off" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <button className="csheet__add" onClick={() => onAdd(extras.filter((x) => picked.has(x.name)))}>
          Add Item
        </button>
      </div>
    </div>
  )
}
