import posthog from 'posthog-js'

// PostHog (US cloud, project 417409). Hardcoded on purpose: this analytics setup lives only on this
// branch. The phc_ key is a public client-side key, safe to ship in the bundle.
const POSTHOG_KEY = 'phc_zHRwdnC2Giz5ZSBSQiQMHgXrDCFvbUvhcgjMadzWia3x'
const POSTHOG_HOST = 'https://us.i.posthog.com'

export function initAnalytics() {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // screens are state-driven, so pageviews are fired by trackScreen()
    capture_pageleave: true,
    autocapture: true, // clicks, inputs, rage-clicks
    person_profiles: 'identified_only',
  })
}

/** Ties every event (clicks included) to this specific guest, so analytics are separated per user. */
export function identifyGuest(
  guestId: string,
  props: { name?: string; email?: string; phone?: string; propertyName?: string; arrivalDate?: string; checkoutDate?: string },
) {
  posthog.identify(guestId, props)
}

export function trackScreen(screen: string) {
  posthog.capture('$pageview', { $current_url: window.location.href, screen })
}
