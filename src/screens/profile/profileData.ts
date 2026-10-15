// Content for the Profile screen — kept as data so the guest details and
// booking history stay config-driven, the way the property system would feed
// the guest app. An empty `bookings` array drives the "nothing booked" state.
import electricTrails from '../../assets/home/exp-electric-trails.png'

export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled'

export type Booking = {
  title: string
  image: string
  date: string
  time: string
  guests: string
  price: string
  status: BookingStatus
  // Shown under a divider on cancelled/refunded bookings.
  note?: string
}

export type GuestProfile = {
  name: string
  location: string
  rooms: string
  email: string
  phone: string
}

export const profile: GuestProfile = {
  name: 'Rhea Menon',
  location: 'Evolve Back, Coorg · Cottage 112',
  rooms: 'Cottage 112',
  email: 'rheamenon@gmail.com',
  phone: '98201 98172',
}

export const bookings: Booking[] = [
  {
    title: 'Electric Trails',
    image: electricTrails,
    date: '15 Jun',
    time: '6:00 am',
    guests: '2 guests',
    price: '₹1,000',
    status: 'Confirmed',
  },
  {
    title: 'Electric Trails',
    image: electricTrails,
    date: '15 Jun',
    time: '6:00 am',
    guests: '2 guests',
    price: '₹1,000',
    status: 'Confirmed',
  },
  {
    title: 'Electric Trails',
    image: electricTrails,
    date: '15 Jun',
    time: '6:00 am',
    guests: '2 guests',
    price: '₹1,000',
    status: 'Cancelled',
    note: 'Your booking for ‘Electric Trails’ at 15 Jun, 6:00 am was cancelled & refunded due to bad weather',
  },
]
