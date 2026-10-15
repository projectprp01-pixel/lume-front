// Content for the Home screen. Kept as data so the UI stays config-driven,
// mirroring how the real product feeds the guest app from the property dashboard.

import icTransport from '../../assets/home/ic-transport.svg'
import icDirections from '../../assets/home/ic-directions.svg'
import icWifi from '../../assets/home/ic-wifi.svg'
import icDirectory from '../../assets/home/ic-directory.svg'
import icFacilities from '../../assets/home/ic-facilities.svg'
import icDining from '../../assets/home/ic-dining.svg'

import expElectricTrails from '../../assets/home/exp-electric-trails.png'
import expBylakuppe from '../../assets/home/exp-bylakuppe.png'

import gallery1 from '../../assets/home/gallery-1.png'
import gallery2 from '../../assets/home/gallery-2.png'
import gallery3 from '../../assets/home/gallery-3.png'
import gallery4 from '../../assets/home/gallery-4.png'
import gallery5 from '../../assets/home/gallery-5.png'
import gallery6 from '../../assets/home/gallery-6.png'
import gallery7 from '../../assets/home/gallery-7.png'

export const stay = {
  guestName: 'Rhea',
  checkIn: '12 Jun',
  checkOut: '17 Jun',
  guests: '2',
}

export const quickActions = [
  { icon: icTransport, label: 'Transport' },
  { icon: icDirections, label: 'Directions' },
  { icon: icWifi, label: 'WiFi Details' },
  { icon: icDirectory, label: 'Directory' },
  { icon: icFacilities, label: 'Facilities' },
  { icon: icDining, label: 'In-room Dining' },
]

export const experiences = [
  {
    image: expElectricTrails,
    badge: 'Kids special',
    title: 'Electric Trails',
    subtitle: 'Eco-Friendly Village Cycling',
    time: '8:00 am',
    price: '₹ 1,000 per person',
  },
  {
    image: expBylakuppe,
    badge: null,
    title: 'Bylakuppe Tibetan Settlement',
    subtitle: 'Cultural Experience',
    time: '9:00 am - 9:00 pm',
    price: '₹ 1,000 per person',
  },
]

export type PlanStatus = 'upcoming' | 'now' | 'done'

export const todaysPlan: {
  title: string
  detail: string
  meta: string
  time: string
  status: PlanStatus
}[] = [
  {
    title: 'Your transfer',
    detail: 'Pickup at 10:00 AM · Bengaluru airport',
    meta: '',
    time: '10:00am',
    status: 'upcoming',
  },
  {
    title: 'Abhyanga Massage',
    detail: 'Spa Pavillion',
    meta: 'Booked',
    time: 'Now',
    status: 'now',
  },
  {
    title: 'Guided Plantation Tour',
    detail: 'Serene plantation walk',
    meta: 'Complimentary · Done',
    time: '7:00 pm',
    status: 'done',
  },
]

export const gallery = [
  gallery4, // top-left
  gallery7, // top-right (large)
  gallery5, // mid-left (tall)
  gallery1, // small
  gallery2, // small
  gallery6, // bottom-left
  gallery3, // bottom-right (wide)
]
