// Typed wrappers for the lume-backend guest-facing endpoints the app uses.
// See lume-backend/src/routes/{experience,guest,checkin}.routes.js.

import { apiFetch } from './client'
import type {
  ApiBooking,
  ApiCheckIn,
  ApiDiscount,
  ApiDiningReservation,
  ApiFbOrder,
  ApiInRoomMenu,
  ApiExperience,
  ApiExperienceBooking,
  ApiGuest,
  ApiNotification,
  ApiRestaurant,
  ApiPropertySettings,
  ApiServiceRequest,
  ApiSpaBooking,
  ApiSpaFacility,
  ApiTokenResult,
  ApiTransportBooking,
  ApiTransportResult,
} from './types'

// ---- Auth / identity --------------------------------------------------------

export function getBookingByToken(token: string) {
  return apiFetch<ApiTokenResult>(`/checkin/booking/${encodeURIComponent(token)}`)
}

export function getGuest(guestId: string) {
  return apiFetch<ApiGuest>(`/guests/${guestId}`)
}

// Most recent check-in for this guest (or null), used to pre-fill the pre-stay
// check-in flow with any progress already made. See checkin.routes.js /by-guest.
export function getCheckInByGuest(guestId: string) {
  return apiFetch<ApiCheckIn | null>(`/checkin/by-guest?guestId=${guestId}`)
}

// Create (or fetch existing) check-in session; returns it with its _id.
export function initializeCheckIn(input: { bookingId: string; guestId: string; totalGuests: number }) {
  return apiFetch<ApiCheckIn>('/checkin/initialize', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// Upload one person's ID (front required, back optional) to Cloudflare R2.
export function uploadCheckInId(
  checkInId: string,
  input: { guestNumber: number; guestName: string; idType?: string; idFront: File; idBack?: File | null },
) {
  const form = new FormData()
  form.append('guestNumber', String(input.guestNumber))
  form.append('guestName', input.guestName)
  form.append('idType', input.idType ?? 'other')
  form.append('idFront', input.idFront)
  if (input.idBack) form.append('idBack', input.idBack)
  return apiFetch<ApiCheckIn>(`/checkin/${checkInId}/upload-id`, { method: 'POST', body: form })
}

// Submit the check-in for staff review.
export function completeCheckIn(checkInId: string, guestNotes?: string) {
  return apiFetch<ApiCheckIn>(`/checkin/${checkInId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ guestNotes: guestNotes ?? '' }),
  })
}

// ---- Catalog (no guest required) -------------------------------------------

// The catalog endpoints return every property's activities unless scoped. The dashboard (and property
// settings) work on the "default" property, so the guest app lists only what that dashboard lists.
const PROPERTY_ID = 'default'

export function getExperiences(params?: { category?: string }) {
  const qs = new URLSearchParams({ propertyId: PROPERTY_ID })
  if (params?.category && params.category !== 'all') qs.set('category', params.category)
  return apiFetch<ApiExperience[]>(`/experiences?${qs}`)
}

export function getSpotlightExperiences() {
  return apiFetch<ApiExperience[]>(`/experiences/spotlight?propertyId=${PROPERTY_ID}`)
}

export function getExperienceById(id: string) {
  return apiFetch<ApiExperience>(`/experiences/${id}`)
}

export type SlotAvailability = {
  experienceId: string
  experienceName: string
  date: string
  basePrice: number
  currency: string
  slots: { time: string; capacity: number; available: number; priceModifier: number; isAvailable: boolean }[]
}

export function getExperienceSlots(id: string, date: string) {
  return apiFetch<SlotAvailability>(`/experiences/${id}/slots?date=${encodeURIComponent(date)}`)
}

export function createExperienceBooking(input: {
  experienceId: string
  guestId?: string
  guestName: string
  guestEmail?: string
  guestPhone?: string
  date: string
  timeSlot: string
  numberOfGuests: number
  price?: number
  specialRequests?: string
  addonNames?: string[]
}) {
  return apiFetch<{ _id: string; bookingId?: string; totalAmount?: number; paymentStatus?: string }>('/experiences/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getRestaurants() {
  return apiFetch<ApiRestaurant[]>('/guests/restaurants/all')
}

// Intimate-dining availability for one date: tables left that night.
export function getDiningAvailability(facilityId: string, date: string) {
  return apiFetch<{ available: boolean; remaining: number | null; tablesPerNight: number | null; reason?: string }>(
    `/guests/dining/availability?facilityId=${facilityId}&date=${date}`,
  )
}

export function createDiningReservation(input: {
  facilityId: string
  guestId?: string
  bookingId?: string
  date: string
  numberOfGuests: number
  addonNames?: string[]
}) {
  return apiFetch<{ _id: string; reservationRef?: string; amount?: number }>('/guests/dining/book', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getInRoomMenu() {
  return apiFetch<ApiInRoomMenu>('/guests/in-room-dining/menu')
}

export function createInRoomOrder(input: {
  guestId: string
  room?: string
  notes?: string
  items: { dishId: string; qty: number; extras?: string[] }[]
}) {
  return apiFetch<ApiFbOrder>('/guests/in-room-dining/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getPropertySettings() {
  return apiFetch<ApiPropertySettings>('/guests/property-settings')
}

// Dashboard discounts & promotions currently available to this guest (cutoff-before-check-in ones
// are evaluated against the guest's arrival server-side).
export function getDiscounts(guestId?: string | null) {
  return apiFetch<ApiDiscount[]>(`/guests/discounts${guestId ? `?guestId=${guestId}` : ''}`)
}

// ---- Per-guest data ---------------------------------------------------------

export function getGuestRequests(guestId: string) {
  return apiFetch<ApiServiceRequest[]>(`/guests/requests?guestId=${guestId}`)
}

export function createGuestRequest(guestId: string, content: string) {
  return apiFetch<ApiServiceRequest>('/guests/requests', {
    method: 'POST',
    body: JSON.stringify({ guestId, content }),
  })
}

export function getGuestNotifications(guestId: string) {
  return apiFetch<ApiNotification[]>(`/guests/${guestId}/notifications`)
}

// Saves the guest's own name / email / phone (PUT /guests/:id/contact).
export function updateGuestContact(
  guestId: string,
  body: { fullName?: string; email?: string; mobileNumber?: string; countryCode?: string },
) {
  return apiFetch<ApiGuest>(`/guests/${guestId}/contact`, { method: 'PUT', body: JSON.stringify(body) })
}

export function getGuestExperienceBookings(guestId: string) {
  return apiFetch<ApiExperienceBooking[]>(`/experiences/bookings/guest/${guestId}`)
}

export function getGuestSpaBookings(guestId: string) {
  return apiFetch<ApiSpaBooking[]>(`/guests/spa/bookings/guest/${guestId}`)
}

export function getSpaFacilities() {
  // Scoped to this property: unscoped, a hidden spa falls back to other properties' facilities.
  return apiFetch<ApiSpaFacility[]>(`/guests/spa?propertyId=${PROPERTY_ID}`)
}

// `guests`: the party size, so a slot with fewer places left than that comes back unavailable.
export function getSpaTimeSlots(facilityId: string, date: string, guests = 1) {
  return apiFetch<{ time: string; available: boolean; remaining: number }[]>(
    `/guests/spa/timeslots?facilityId=${facilityId}&date=${date}&guests=${guests}`,
  )
}

export function createSpaBooking(input: {
  spaFacilityId: string
  treatmentId: string
  treatmentName: string
  categoryName?: string
  guestId?: string
  guestName: string
  numberOfGuests: number
  date: string
  timeSlot: string
  duration?: number
  price: number
  addons?: { name: string; price: number }[]
  propertyId: string
}) {
  return apiFetch<{ _id: string; bookingId?: string; price?: number }>('/guests/spa/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getGuestDiningReservations(guestId: string) {
  return apiFetch<ApiDiningReservation[]>(`/guests/dining/reservations/guest/${guestId}`)
}

export function getGuestTransport(guestId: string) {
  return apiFetch<ApiTransportResult>(`/guests/transport?guestId=${guestId}`)
}

export function getGuestTransportBookings(guestId: string) {
  return apiFetch<ApiTransportBooking[]>(`/guests/transport/bookings/guest/${guestId}`)
}

export function createTransportBooking(input: {
  guestId: string
  bookingId: string
  offeringSlot: number
  // One entry per car type picked; the server prices them and stores them on the booking.
  items: { vehicleId: string; quantity: number; days: string[]; city: string; pickupAddon: boolean }[]
  amount?: number
  propertyId?: string
}) {
  return apiFetch<{ _id: string; ref?: string }>('/guests/transport/book', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function markNotificationRead(notifId: string) {
  return apiFetch<ApiNotification>(`/guests/notifications/${notifId}/read`, { method: 'PUT' })
}

export function markAllNotificationsRead(guestId: string) {
  return apiFetch<unknown>(`/guests/${guestId}/notifications/read-all`, { method: 'PUT' })
}

export type { ApiBooking }
