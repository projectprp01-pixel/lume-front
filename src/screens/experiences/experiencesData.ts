// Content for the Experiences screen — kept as data so the grid stays
// config-driven, the way the property dashboard would feed the guest app.

import culturalShow from '../../assets/experiences/exp-cultural-show.png'
import plantationTour from '../../assets/experiences/exp-plantation-tour.png'

import chipAll from '../../assets/experiences/chip-all.svg'
import chipNature from '../../assets/experiences/chip-nature.svg'
import chipWellness from '../../assets/experiences/chip-wellness.svg'

export const filters = [
  { key: 'all', label: 'All', icon: chipAll },
  { key: 'nature', label: 'Nature', icon: chipNature },
  { key: 'wellness', label: 'Wellness', icon: chipWellness },
]

export type Experience = {
  image: string
  title: string
  subtitle: string
  meta: string
}

export const experiences: Experience[] = [
  {
    image: culturalShow,
    title: 'Cultural Show',
    subtitle: 'Showcasing local art forms',
    meta: 'Complimentary',
  },
  {
    image: plantationTour,
    title: 'Guided Plantation Tour',
    subtitle: 'Serene plantation walk',
    meta: '₹1,200',
  },
  {
    image: plantationTour,
    title: 'Coracle Ride',
    subtitle: 'Traditional river coracle experience',
    meta: '₹800',
  },
  {
    image: culturalShow,
    title: 'Village Cycling',
    subtitle: 'Eco-friendly electric trails',
    meta: '₹1,000',
  },
  {
    image: plantationTour,
    title: 'Sunset by the Kabini',
    subtitle: 'Guided lakeside evening',
    meta: 'Complimentary',
  },
  {
    image: culturalShow,
    title: 'Birding Walk',
    subtitle: 'Dawn trail with a naturalist',
    meta: '₹600',
  },
]
