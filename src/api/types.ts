// DTOs returned by lume-backend. These mirror the Mongoose models closely but
// only type the fields the guest app actually reads. Backend documents carry
// many more fields; extra properties are allowed and simply ignored.

export type ApiExperience = {
  _id: string
  title: string
  shortDescription?: string
  fullDescription?: string
  category: string
  imageUrl?: string
  images?: unknown[]
  pricing?: {
    basePrice?: number
    currency?: string
    pricePerPerson?: boolean
  }
  pricingLabel?: string
  durationDisplayText?: string
  duration?: { value?: number; unit?: 'minutes' | 'hours' | 'days' }
  isFeatured?: boolean
  isSpotlight?: boolean
  isCrafted?: boolean
  isActive?: boolean
  availability?: string
  inclusions?: string[]
  groupSize?: { min?: number; max?: number }
  // false = a group activity: the guest buys one unit and cannot pick a guest count
  guestCanChooseGroupSize?: boolean
  // dashboard "Max & Min Guests" switch: show the guest range to guests
  guestsEnabled?: boolean
  timeSlots?: { time: string; endTime?: string; label?: string }[]
  // Date ranges (YYYY-MM-DD, inclusive) staff have blocked in the dashboard
  blockedRanges?: { start: string; end: string }[]
  // Media from the dashboard: photos { image, title, description }; videos add a playable { url } with image as poster
  videos?: { image?: string; url?: string; title?: string; description?: string }[]
  addOns?: { name: string; price?: number; description?: string; note?: string; type?: string }[]
}

export type ApiRestaurant = {
  _id: string
  name: string
  description?: string
  subtitle?: string
  cuisine?: string[]
  imageUrl: string
  facilityType?: 'restaurant' | 'intimate_dining'
  mealTimes?: ('breakfast' | 'lunch' | 'dinner')[]
  openTime?: string
  closeTime?: string
  price?: number
  pricingLabel?: string
  isFeatured?: boolean
  // Intimate-dining detail fields
  images?: string[]
  whatsIncluded?: string[]
  bookingMode?: 'reservations' | 'info-only'
  maxGuests?: number
  guestCanChooseGroupSize?: boolean
  tablesPerNight?: number
  slots?: { name?: string; startTime?: string; endTime?: string; capacity?: string; active?: boolean }[]
  blockedDates?: string[]
  // Date ranges (YYYY-MM-DD, inclusive) staff blocked in the dashboard
  blockedRanges?: { start: string; end: string }[]
  availableDays?: string[]
  addons?: { name: string; price?: number; description?: string }[]
  menus?: { label?: string; fileUrl?: string }[]
}

export type ApiGuest = {
  _id: string
  fullName: string
  email: string
  mobileNumber?: string
  countryCode?: string
  roomNumber?: string | null
  numberOfGuests?: number
}

export type ApiBooking = {
  id?: string
  _id?: string
  bookingId: string
  primaryGuestName: string
  propertyName?: string
  numberOfGuests?: number
  numberOfChildren?: number
  arrivalDate: string
  checkoutDate: string
  roomType?: string | null
  roomNumber?: string | null
  checkInStatus?: string
}

// Returned by GET /api/checkin/booking/:token
export type ApiTokenResult = {
  booking: ApiBooking
  guest: {
    id: string
    fullName: string
    email: string
    mobileNumber?: string
    countryCode?: string
    consentGiven?: boolean
  }
}

export type ApiServiceRequest = {
  _id: string
  item: string
  // Front Desk replies posted from the dashboard
  replies?: { body: string; sentAt?: string; sentBy?: string }[]
  status: 'Pending' | 'Assigned' | 'In-progress' | 'Completed'
  roomNumber?: string
  createdAt: string
  completedAt?: string | null
}

export type ApiSpaBooking = {
  _id: string
  bookingId?: string
  treatmentName: string
  spaFacilityId?: string
  date: string
  timeSlot: string
  numberOfGuests?: number
  price?: number
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled'
}

export type ApiDiningReservation = {
  _id: string
  facilityId?: string
  facilityName: string
  date: string
  numberOfGuests?: number
  amount?: number
  status: 'pending' | 'confirmed' | 'cancelled'
}

// GET /guests/transport/bookings/guest/:guestId (the guest's confirmed transport bookings)
export type ApiTransportBooking = {
  _id: string
  ref?: string
  checkInDate: string
  checkOutDate?: string
  nights?: number
  amount: number
  status: string
  offeringSlot?: number
  vehicleId?: string
  vehicleName?: string
  days?: string[]
  city?: string
  items?: { vehicleId?: string; vehicleName?: string; quantity?: number; days?: string[]; city?: string }[]
}

export type ApiFacility = { name: string; timing?: string; days?: string; photo?: string }

export type ApiDirectoryEntry = {
  name: string
  meta?: string
  phone?: string
  style?: 'normal' | 'urgent' | 'whatsapp'
}

export type ApiPropertySettings = {
  checkInTime?: string
  checkOutTime?: string
  heroImage?: string
  propertyName?: string
  story?: string[]
  rules?: (string | { heading: string; body: string })[]
  facilities?: ApiFacility[]
  galleryCategories?: string[]
  gallery?: { photo: string; category?: string; featured?: boolean }[]
  wifi?: { roomType?: string; network?: string; password?: string }[]
  directory?: ApiDirectoryEntry[]
  // Directions page (the guest property-settings endpoint must expose these)
  // Dashboard Check-in Hub's instructions text, shown on the Online Check-in screen.
  checkInInstructions?: string
  mapsLink?: string
  address?: string
  // Footer sign-off (dashboard Property Settings > Footer); empty until saved
  footerHeading?: string
  footerSubtext?: string
  // Requests price sheet (dashboard Guest App builder → guestApp.reqCategories)
  reqCategories?: ApiRequestCategory[]
  // Dashboard Guest App builder document (see guest/AppConfig.tsx). {} until first saved.
  guestApp?: ApiGuestApp
}

export type ApiStage = 'prestay' | 'instay' | 'both'

export type ApiGuestApp = {
  pageEnabled?: { experiences?: boolean; dining?: boolean; requests?: boolean }
  heroImage?: string
  homeToggles?: {
    quickActions?: boolean
    expCallout?: boolean
    todaysPlan?: boolean
    spotlight?: boolean
    events?: boolean
    gallery?: boolean
  }
  quickActions?: {
    prestay?: Partial<Record<QuickActionKey, boolean>>
    instay?: Partial<Record<QuickActionKey, boolean>>
  }
  expCalloutTitle?: string
  expCalloutItems?: { id: string; sourceType: 'experience' | 'spa'; sourceId: string; stage?: ApiStage; badge?: string }[]
  spotlightItems?: { id: string; title: string; body: string; image: string; ctaTarget: string; stage?: ApiStage }[]
  eventItems?: {
    id: string
    title: string
    subtext: string
    details: string
    image: string
    activeFrom?: string
    activeUntil?: string
    targetLink?: string
  }[]
  expHero?: { image?: string; heading?: string; subtext?: string; ctaLabel?: string; ctaTarget?: 'spa' | 'experience' | 'dining' }
  expSections?: {
    id: number
    heading: string
    subtext?: string
    sourceType: 'spa' | 'experience' | 'dining'
    showViewAll?: boolean
    enabled?: boolean
    items: { id: string; sourceId: string; badge?: string }[]
  }[]
  diningHero?: {
    prestay?: { image?: string; heading?: string; subtext?: string }
    instay?: { image?: string; eyebrow?: string; heading?: string; ctaLabel?: string }
  }
  inRoomOrderingEnabled?: boolean
  diningSections?: {
    id: number
    heading: string
    subtext?: string
    enabled?: boolean
    items: { id: string; restaurantId: string; imageOverride?: string }[]
  }[]
  reqCategories?: ApiRequestCategory[]
  reqIntro?: string
}

export type QuickActionKey = 'transport' | 'wifi' | 'directory' | 'facilities' | 'inRoomDining' | 'directions'

// A currently-eligible dashboard discount (GET /guests/discounts).
export type ApiDiscount = {
  id: string
  kind: 'experience' | 'spa' | 'dining'
  name: string
  discountType: 'percent' | 'flat'
  value: number
  maxCap: number | null
  itemIds: string[]
}

export type ApiRequestCategory = {
  id?: string
  name: string
  subtext?: string
  icon?: string
  services?: { service: string; cost: string }[]
  enabled?: { prestay?: boolean; instay?: boolean }
}

export type ApiSpaTreatment = {
  _id?: string
  name: string
  description?: string
  subtitle?: string
  price?: number
  // The dashboard stores the treatment photo as imageUrl
  imageUrl?: string
  image?: string
  // Legacy single duration in minutes; durations[] lists the bookable lengths with their prices
  duration?: number
  durations?: { minutes: number; price?: number }[]
  included?: string[]
  pricingLabel?: string
  timeSlots?: { label?: string; startTime: string }[]
  capacityMax?: number
  blockedDates?: string[]
  addons?: { name: string; description?: string; price?: number }[]
}

export type ApiSpaFacility = {
  _id: string
  propertyId?: string
  name: string
  subtitle?: string
  description?: string
  listingImage?: string
  detailImage?: string
  gallery?: string[]
  timeSlots?: string[]
  availableDays?: string[]
  blockedDates?: string[]
  categories?: { name: string; treatments?: ApiSpaTreatment[] }[]
}

export type ApiVehicle = {
  _id: string
  name: string
  type?: string
  capacity?: string
  photoUrl?: string
}

export type ApiTransportOffering = {
  _id?: string
  slot: number
  name: string
  desc?: string
  structure: 'daily' | 'p2p' | 'custom'
  flatRate?: boolean
  // Full trip cab only: 'calculated' (default) = sightseeing rate x nights + pickup fare; 'custom' = fixed price
  // per car / pickup city / nights, held in vehiclePricing[].cities
  pricingMode?: 'calculated' | 'custom'
  published?: boolean
  included?: string[]
  vehiclePricing?: { vehicleId: string; price: number; cities?: { city: string; tiers: { nights: number; price: number }[] }[] }[]
  // Vehicles the property allows on this offering (pricing rows can exist for others)
  eligibleVehicles?: string[]
  // Slots of other offerings sold as an add-on to this one
  addons?: number[]
  // Per-city fares by vehicle (pickup/drop). Daily/full-trip offerings borrow the pickup offering's cities.
  cities?: { name: string; vehiclePrices?: { vehicleId: string; price: number }[] }[]
}

export type ApiTransportResult = {
  settings: {
    pageTitle?: string
    introText?: string
    transfersDescription?: string
    heroImage?: string
    heroDesc?: string
    priceIncludes?: { label: string }[]
    vehicles?: ApiVehicle[]
    offerings?: ApiTransportOffering[]
  }
  matchedPrice?: number
  nights?: number
  routeLabel?: string
}

export type ApiNotification = {
  _id: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'promo'
  read?: boolean
  relatedType?: string
  createdAt: string
}

export type ApiCheckInDocument = {
  guestNumber: number
  guestName?: string
  idFrontUrl?: string
  idBackUrl?: string | null
  verified?: boolean
  // Set when the hotel sent this person's ID back; cleared when they re-upload.
  rejectionReason?: string
}

export type ApiCheckIn = {
  _id: string
  status: 'initiated' | 'documents-uploaded' | 'pending-review' | 'approved' | 'rejected' | 'completed'
  totalGuests: number
  documentsCompleted: number
  guestDocuments: ApiCheckInDocument[]
}

export type ApiExperienceBooking = {
  _id: string
  experienceName: string
  date: string
  timeSlot: string
  numberOfGuests: number
  unitPrice?: number
  totalAmount?: number
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  experienceId?: { _id: string; title: string } | string | null
}

// ---- In-room dining (GET /guests/in-room-dining/menu) -----------------------
export type ApiFbDish = {
  _id: string
  name: string
  description?: string
  price: number
  dietType: 'Veg' | 'Non-Veg' | 'Vegan' | 'Egg'
  gstPercent?: number
  serves?: string
  tags?: string[]
  imageUrl?: string
}

export type ApiFbSubcategory = { _id: string; name: string; dishes: ApiFbDish[] }

export type ApiFbCategory = {
  _id: string
  name: string
  desc?: string
  openTime?: string // "07:00"
  closeTime?: string
  imageUrl?: string
  subcategories: ApiFbSubcategory[]
}

export type ApiInRoomMenu = {
  kitchen: {
    opens: string
    closes: string
    packagingCharge: number
    open: boolean
    // why it is closed: 'paused' (temporarily), 'outside-hours', or 'disabled'
    reason: string | null
    closesInMinutes: number | null
  }
  categories: ApiFbCategory[]
}

export type ApiFbOrder = {
  _id: string
  stage: 'placed' | 'accepted' | 'prepared' | 'delivered'
  room?: string
  items: { name: string; qty: number; price: number; gstPercent?: number }[]
  packagingCharge?: number
  createdAt?: string
}
