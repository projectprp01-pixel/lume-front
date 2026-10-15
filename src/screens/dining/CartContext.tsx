import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ApiFbDish } from '../../api/types'

// In-room dining cart, shared by the menu and the cart screens. Kept in
// sessionStorage so a reload mid-order doesn't lose it.

const KEY = 'lume_inroom_cart'

export type CartLine = { dish: ApiFbDish; qty: number }

type CartValue = {
  lines: CartLine[]
  count: number // total quantity
  qtyOf: (dishId: string) => number
  add: (dish: ApiFbDish) => void
  remove: (dishId: string) => void // one less, drops the line at zero
  clear: () => void
  // Prices are shown GST-exclusive per dish; the order total adds GST per line.
  subtotal: number
  gst: number
}

const CartContext = createContext<CartValue | null>(null)

function load(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
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
    const subtotal = lines.reduce((s, l) => s + l.dish.price * l.qty, 0)
    const gst = lines.reduce((s, l) => s + (l.dish.price * l.qty * (l.dish.gstPercent ?? 0)) / 100, 0)
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      qtyOf: (id) => lines.find((l) => l.dish._id === id)?.qty ?? 0,
      add: (dish) =>
        setLines((prev) => {
          const hit = prev.find((l) => l.dish._id === dish._id)
          return hit
            ? prev.map((l) => (l.dish._id === dish._id ? { ...l, qty: Math.min(20, l.qty + 1) } : l))
            : [...prev, { dish, qty: 1 }]
        }),
      remove: (id) =>
        setLines((prev) =>
          prev
            .map((l) => (l.dish._id === id ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        ),
      clear: () => setLines([]),
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
