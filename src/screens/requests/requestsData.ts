// Content for the Requests screen — kept as data so the list stays
// config-driven, the way the property dashboard would feed the guest app.

// A single guest request card. `progress` is optional: cards that are still
// being fulfilled show a Received / In progress / Done tracker; completed
// cards omit it.
export type RequestStatus = 'Confirmed' | 'Completed'
export type RequestStage = 'received' | 'in-progress' | 'done'

export type Request = {
  title?: string
  message: string
  time: string
  room?: string
  price: string
  status: RequestStatus
  progress?: RequestStage
}

export const requests: Request[] = [
  {
    title: 'Water bottles',
    message: 'Hey can we please have 3 water bottles delivered to the room',
    time: 'Requested at 2:14 PM',
    room: 'Room no. 12',
    price: '₹1,000',
    status: 'Confirmed',
    progress: 'in-progress',
  },
  {
    message: 'Hey can we please have 3 water bottles delivered to the room',
    time: 'Requested at 2:14 PM',
    price: '₹0',
    status: 'Completed',
  },
]

// ---- Price sheet ------------------------------------------------------------
// Request categories (tiles on the empty state + tabs in the price-sheet modal).
// Mirrors the property's `guestApp.reqCategories`; used until the live list is
// available. `icon` keys map to the bundled Figma icons.
export type PriceCategory = {
  name: string
  subtext: string
  icon: 'housekeeping' | 'refreshments' | 'transport' | 'laundry' | 'baby' | 'occasions' | null
  iconUrl?: string // remote icon from the backend, for categories with no bundled icon
  services: { service: string; cost: string }[]
}

export const priceSheet: PriceCategory[] = [
  {
    name: 'Housekeeping',
    subtext: 'Room clean, turndown, extra towels',
    icon: 'housekeeping',
    services: [
      { service: 'Extra towels or toiletries', cost: 'Complimentary' },
      { service: 'Pillow or blanket preference', cost: 'Complimentary' },
      { service: 'Room cleaning / turndown service', cost: 'Complimentary' },
      { service: 'Maintenance (broken fixture, faulty light, leaking tap)', cost: 'Complimentary' },
      { service: 'Baby cot or extra bed', cost: 'Rs. 500 per extra bed' },
    ],
  },
  {
    name: 'Refreshments',
    subtext: 'Water bottles, tea, coffee, ice',
    icon: 'refreshments',
    services: [
      { service: 'Bottled water (still)', cost: 'Complimentary' },
      { service: 'Tea / coffee sachets restock', cost: 'Complimentary' },
      { service: 'Ice bucket refill', cost: 'Complimentary' },
      { service: 'Soft drinks / mixers', cost: 'Rs. 150 per bottle' },
    ],
  },
  {
    name: 'Transport',
    subtext: 'Golf cart, cab, airport drop',
    icon: 'transport',
    services: [
      { service: 'Golf cart within property', cost: 'Complimentary' },
      { service: 'Local cab booking', cost: 'As per meter' },
      { service: 'Airport drop', cost: 'Rs. 2,500 one-way' },
    ],
  },
  {
    name: 'Laundry',
    subtext: 'Pickup from your room',
    icon: 'laundry',
    services: [
      { service: 'Wash & fold, per kg', cost: 'Rs. 150' },
      { service: 'Dry cleaning, per item', cost: 'Rs. 300' },
      { service: 'Express service (same day)', cost: '+50% surcharge' },
    ],
  },
  {
    name: 'Baby & kids',
    subtext: 'Cot, highchair, extra blanket',
    icon: 'baby',
    services: [
      { service: 'Baby cot', cost: 'Rs. 500 per stay' },
      { service: 'Highchair', cost: 'Complimentary' },
      { service: 'Extra blanket', cost: 'Complimentary' },
    ],
  },
  {
    name: 'Special occasions',
    subtext: 'Decorations, cake, flowers',
    icon: 'occasions',
    services: [
      { service: 'Room decoration', cost: 'Rs. 2,000 onwards' },
      { service: 'Celebration cake (1 kg)', cost: 'Rs. 1,200' },
      { service: 'Fresh flower arrangement', cost: 'Rs. 800 onwards' },
    ],
  },
]
