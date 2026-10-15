import { apiFetch } from './client'

// Razorpay Standard Checkout (test mode while the backend holds rzp_test_ keys). The backend creates
// the order from its own copy of the booking (so the price can't be tampered with) and verifies the
// payment signature afterwards; this file only drives the pop-up in between.

type RazorpayResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
  handler: (r: RazorpayResponse) => void
}

declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void }
  }
}

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const el = document.createElement('script')
    el.src = 'https://checkout.razorpay.com/v1/checkout.js'
    el.onload = () => resolve(true)
    el.onerror = () => resolve(false)
    document.body.appendChild(el)
  })
}

type Order = { orderId: string; amount: number; currency: string; bookingId: string; key: string }

export type PayResult = 'paid' | 'dismissed'

/** Opens Razorpay checkout for an existing (pending) booking. Resolves 'paid' once the backend has
 *  verified the payment, 'dismissed' if the guest closes the pop-up, and rejects on real errors. */
export function payForBooking(input: {
  bookingId: string
  description: string
  prefill?: { name?: string; email?: string; contact?: string }
}): Promise<PayResult> {
  return payForBookings({ bookingIds: [input.bookingId], description: input.description, prefill: input.prefill })
}

/** One payment for several bookings (the cart): the backend sums them into a single Razorpay order. */
export async function payForBookings(input: {
  bookingIds: string[]
  description: string
  prefill?: { name?: string; email?: string; contact?: string }
}): Promise<PayResult> {
  if (!(await loadScript()) || !window.Razorpay) {
    throw new Error('Could not load the payment window. Check your connection and try again.')
  }

  const order = await apiFetch<Order>('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ bookingIds: input.bookingIds }),
  })

  // Razorpay rejects malformed phone numbers, so only pass a clean 10-digit Indian number.
  const prefill: NonNullable<RazorpayOptions['prefill']> = {}
  if (input.prefill?.name) prefill.name = input.prefill.name
  if (input.prefill?.email) prefill.email = input.prefill.email
  const digits = (input.prefill?.contact ?? '').replace(/\D/g, '')
  if (digits.length >= 10) prefill.contact = `+91${digits.slice(-10)}`

  return new Promise<PayResult>((resolve, reject) => {
    let handled = false // Razorpay also fires ondismiss after a successful payment closes
    const rzp = new window.Razorpay!({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Evolve Back',
      description: input.description,
      prefill,
      theme: { color: '#342727' },
      modal: {
        ondismiss: () => {
          if (!handled) resolve('dismissed')
        },
      },
      handler: async (r) => {
        handled = true
        try {
          await apiFetch('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({ ...r, bookingIds: input.bookingIds }),
          })
          resolve('paid')
        } catch (err) {
          reject(err)
        }
      },
    })
    rzp.open()
  })
}
