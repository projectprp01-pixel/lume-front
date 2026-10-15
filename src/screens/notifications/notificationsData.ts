// Content for the Notifications screen. Items either carry a booking `meta`
// row (date · time · guests) or a free-text `description`. A missing `image`
// renders the muted placeholder thumbnail. An empty array drives the zero state.
import electricTrails from '../../assets/home/exp-electric-trails.png'

export type Notification = {
  title: string
  image?: string
  meta?: string[]
  description?: string
  timestamp: string
}

export const notifications: Notification[] = [
  {
    title: 'Abhyanga massage in 30 minutes',
    meta: ['15 Jun', '6:00 pm', '2 guests'],
    timestamp: 'Today at 5:30 pm',
  },
  {
    title: '‘Electric Trails’ booking confirmed!',
    image: electricTrails,
    meta: ['15 Jun', '6:00 pm', '2 guests'],
    timestamp: 'Today at 5:30 pm',
  },
  {
    title: 'Order Delivered!',
    description: 'Your in-room dining order has been delivered to your room.',
    timestamp: 'Jun 16 2026, 2:40 pm',
  },
  {
    title: 'Order on its way',
    description:
      'Your in-room dining order has left the kitchen. Arriving in about 10 minutes.',
    timestamp: 'Jun 16 2026, 2:40 pm',
  },
  {
    title: 'Order accepted',
    description:
      'Your in-room dining order has left the kitchen. Arriving in about 10 minutes.',
    timestamp: 'Jun 16 2026, 2:40 pm',
  },
]
