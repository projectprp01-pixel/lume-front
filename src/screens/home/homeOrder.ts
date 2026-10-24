// Order of the toggleable Home sections below the hero banner, as saved in the dashboard's
// Guest App builder. Unknown keys are dropped and any missing key is appended in default order,
// so an absent / stale list always renders the original layout.
export const HOME_SECTION_KEYS = ['quickActions', 'expCallout', 'todaysPlan', 'spotlight', 'events', 'gallery'] as const
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number]

export function resolveHomeOrder(saved?: string[]): HomeSectionKey[] {
  const known = (saved ?? []).filter((k, i, a): k is HomeSectionKey =>
    (HOME_SECTION_KEYS as readonly string[]).includes(k) && a.indexOf(k) === i,
  )
  return [...known, ...HOME_SECTION_KEYS.filter((k) => !known.includes(k))]
}
