import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ApiFbDish, ApiFbExtra } from '../../api/types'

// In-room dining cart, shared by the menu and the cart screens. Kept in
// sessionStorage so a reload mid-order doesn't lose it.

const KEY = 'lume_inroom_cart'

// One line per dish + set of extras: the same dish with different extras is a different line.
export type CartLine = { key: string; dish: ApiFbDish; qty: number; extras: ApiFbExtra[] }

type CartValue = {
  lines: CartLine[]
  count: number // total quantity
  qtyOf: (dishId: string) => number // across every line of that dish
  add: (dish: ApiFbDish, extras?: ApiFbExtra[]) => void
  remove: (dishId: string) => void // one less on the dish's latest line, drops the line at zero
  bump: (lineKey: string, delta: 1 | -1) => void // the cart screen's per-line stepper
  clear: () => void
  unitPrice: (line: CartLine) => number // dish price + extras
  // Prices are shown GST-exclusive per dish; the order total adds GST per line.
  subtotal: number
  gst: number
}

const CartContext = createContext<CartValue | null>(null)

const lineKey = (dishId: string, extras: ApiFbExtra[]) =>
  `${dishId}|${extras.map((e) => e.name).sort().join('|')}`
const unit = (l: { dish: ApiFbDish; extras: ApiFbExtra[] }) =>
  l.dish.price + l.extras.reduce((s, e) => s + (e.price || 0), 0)

function load(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return []
    // Carts saved before extras existed have no key/extras.
    return (JSON.parse(raw) as Partial<CartLine>[]).map((l) => {
      const extras = l.extras ?? []
      return { dish: l.dish as ApiFbDish, qty: l.qty ?? 1, extras, key: l.key ?? lineKey((l.dish as ApiFbDish)._id, extras) }
    })
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* storage unavailable — the cart just won't survive a reload */
    }
  }, [lines])

  const value = useMemo<CartValue>(() => {
    const subtotal = lines.reduce((s, l) => s + unit(l) * l.qty, 0)
    const gst = lines.reduce((s, l) => s + (unit(l) * l.qty * (l.dish.gstPercent ?? 0)) / 100, 0)
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      qtyOf: (id) => lines.filter((l) => l.dish._id === id).reduce((n, l) => n + l.qty, 0),
      add: (dish, extras = []) =>
        setLines((prev) => {
          const key = lineKey(dish._id, extras)
          const hit = prev.find((l) => l.key === key)
          return hit
            ? prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + 1) } : l))
            : [...prev, { key, dish, qty: 1, extras }]
        }),
      remove: (id) =>
        setLines((prev) => {
          const idx = prev.map((l) => l.dish._id).lastIndexOf(id)
          if (idx < 0) return prev
          return prev.map((l, i) => (i === idx ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0)
        }),
      bump: (key, delta) =>
        setLines((prev) =>
          prev
            .map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + delta) } : l))
            .filter((l) => l.qty > 0),
        ),
      clear: () => setLines([]),
      unitPrice: unit,
      subtotal,
      gst,
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
