import { apiFetch } from './client'

// Razorpay Standard Checkout (test mode while the backend holds rzp_test_ keys). The backend prices the
// cart and creates the order itself (so the price can't be tampered with), verifies the payment signature
// and only THEN creates the bookings; this file only drives the pop-up in between.

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

/** A Razorpay order the server created for a cart (POST /payments/checkout). */
export type CheckoutOrder = { orderId: string; amount: number; currency: string; key: string }

export type PayResult = 'paid' | 'dismissed'

/**
 * Opens Razorpay checkout for a cart order. NO booking exists yet: the server creates every booking in
 * the cart (free and paid together) only once the payment is verified. Resolves 'paid' when the server
 * has verified the payment and booked everything, 'dismissed' if the guest closes the pop-up (nothing was
 * booked, nothing to clean up), and rejects with the server's message if booking failed after payment (the
 * server refunds in that case).
 */
export async function payForOrder(input: {
  order: CheckoutOrder
  description: string
  prefill?: { name?: string; email?: string; contact?: string }
}): Promise<PayResult> {
  if (!(await loadScript()) || !window.Razorpay) {
    throw new Error('Could not load the payment window. Check your connection and try again.')
  }
  const { order } = input

  // Razorpay rejects malformed phone numbers, so only pass a clean 10-digit Indian number.
  const prefill: NonNullable<RazorpayOptions['prefill']> = {}
  if (input.prefill?.name) prefill.name = input.prefill.name
  if (input.prefill?.email) prefill.email = input.prefill.email
  const digits = (input.prefill?.contact ?? '').replace(/D/g, '')
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
          await apiFetch('/payments/verify', { method: 'POST', body: JSON.stringify(r) })
          resolve('paid')
        } catch (err) {
          reject(err)
        }
      },
    })
    rzp.open()
  })
}
