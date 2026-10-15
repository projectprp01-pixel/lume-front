// Content for the Dining screen — kept as data so the lists stay config-driven,
// the way the property's F&B system would feed the guest app.

import heroInRoom from '../../assets/dining/hero-in-room.png'
import peppercorn from '../../assets/dining/peppercorn.png'
import granary from '../../assets/dining/granary.png'
import lanterns from '../../assets/dining/lanterns.png'
import moonlight from '../../assets/dining/moonlight.png'

// ---- In-room dining hero ----
export const inRoom = {
  image: heroInRoom,
  eyebrow: 'IN-ROOM DINING',
  title: 'Breakfast in bed, Dinner by the window',
  cta: 'Order Now →',
}

// ---- Outdoor dining (light cards: restaurants) ----
export type Restaurant = {
  id?: string // backend facility id (absent on the static fallback)
  image: string
  name: string
  type: string
  meals: string
}

export const outdoor: Restaurant[] = [
  {
    image: peppercorn,
    name: 'Peppercorn',
    type: 'Specialty restaurant',
    meals: 'Lunch and Dinner',
  },
  {
    image: granary,
    name: 'Granary',
    type: 'Multi-cuisine restaurant',
    meals: 'Lunch and Dinner',
  },
]

// ---- Intimate dining (dark cards: curated private experiences) ----
export type IntimateExperience = {
  id?: string // backend facility id (absent on the static fallback)
  image: string
  name: string
  hours: string
  price: string
}

export const intimate = {
  title: 'Intimate Dining',
  subtitle: 'Private settings, curated menus, and evenings made to remember',
  items: [
    {
      image: lanterns,
      name: 'Lanterns By The Forest',
      hours: '9:00 am - 9:00 pm',
      price: '₹ 1,000 per person',
    },
    {
      image: moonlight,
      name: 'Moonlight for Two',
      hours: '9:00 am - 9:00 pm',
      price: '₹ 1,000 per person',
    },
  ] as IntimateExperience[],
}
