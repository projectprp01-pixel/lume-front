import type { Priced } from '../guest/AppConfig'
import { formatPrice } from '../api/format'
import './PriceText.css'

// A price that shows the dashboard promotion when one applies: struck-through original, the
// discounted price, and an "x% off" tag. Without a discount it's just the plain price.
export default function PriceText({
  priced,
  unit = '',
  currency = 'INR',
  tag = false,
}: {
  priced: Priced
  unit?: string
  currency?: string
  tag?: boolean
}) {
  const free = priced.price === 0
  const amount = free ? 'Complimentary' : formatPrice(priced.price, currency)
  if (priced.original == null) return <>{free ? amount : `${amount}${unit}`}</>
  return (
    <span className="price-text">
      <s className="price-text__was">{formatPrice(priced.original, currency)}</s>
      <span className="price-text__now">
        <span className="price-text__amt">{amount}</span>
        {!free && unit}
      </span>
      {tag && priced.tag && (
        <span className="price-text__tag" title={priced.label}>
          {priced.tag}
        </span>
      )}
    </span>
  )
}
