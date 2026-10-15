// Content for the pre-stay (pre-arrival) experience: the invitation email the
// guest receives before their check-in date, plus the online check-in flow that
// opens from it. Kept data-driven like the rest of the guest app.
import emailHero from '../../assets/prearrival/email-hero.png'
import expPlantation from '../../assets/prearrival/exp-plantation.png'
import electricTrails from '../../assets/home/exp-electric-trails.png'
import loyalty from '../../assets/home/loyalty.png'
import icPrefGuests from '../../assets/prearrival/ic-pref-guests.svg'
import icPrefDietary from '../../assets/prearrival/ic-pref-dietary.svg'
import icPrefCelebrating from '../../assets/prearrival/ic-pref-celebrating.svg'
import icPrefRoom from '../../assets/prearrival/ic-pref-room.svg'

export const email = {
  sender: 'Evolve Back Coorg',
  recipient: 'guest name',
  time: '2:11 PM',
  eyebrow: 'EVOLVE BACK RESORT, COORG',
  title: 'Your stay is almost here, Mrinalini',
  stay: '3 nights, 27 Jun to 30 Jun, Pool Hut',
  hero: emailHero,
  intro:
    "Hey Mrinalini, we're so excited to welcome you to Evolve Back Coorg soon. A little goes a long way in helping us get everything just right for your stay, so we've put together a few quick things below",
  webAppTitle: 'Help us welcome you smoothly through a personalised web app',
  webAppSubtitle: "Wherever you're coming from, we'll plan around you.",
  reserveTitle: 'Reserve a few favourites before you arrive',
  reserveSubtitle:
    'These few of our most loved experiences, worth booking ahead',
  loyaltyImage: loyalty,
  prefsTitle: 'Tell us a little about your stay',
  prefsSubtitle:
    'A few quick details so we can make this stay feel like it was planned just for you',
  address: ['Address Line 1,', 'Address Line 2,', 'Address Line 3'],
}

export type PreArrivalExperience = {
  image: string
  title: string
  subtitle: string
}

export const reserveExperiences: PreArrivalExperience[] = [
  { image: expPlantation, title: 'Plantation Walk', subtitle: 'Serene plantation walk' },
  { image: electricTrails, title: 'Electric Trails', subtitle: 'Eco-Friendly Village Cycling' },
]

export type Preference = { icon: string; label: string }

export const preferences: Preference[] = [
  { icon: icPrefGuests, label: 'Who’s joining you' },
  { icon: icPrefDietary, label: 'Dietary preferences' },
  { icon: icPrefCelebrating, label: 'Celebrating' },
  { icon: icPrefRoom, label: 'Room preferences' },
]

// ---- Online check-in ----
export type CheckInGuest = {
  name: string
  idProof: string
  // A data-URL / blob preview once a document is "uploaded" in this session.
  uploaded?: boolean
}

// 4 guest slots for this booking; the primary guest is pre-filled.
export const checkInSlots = 4

export const primaryGuest = {
  firstName: 'Rhea',
  lastName: 'Menon',
  email: 'rheamenon@gmail.com',
  phone: '98201 98172',
}
