// Pure maths for the half-star rating control, kept free of React so it can be checked on its own.

export const MIN_RATING = 0.5
export const MAX_RATING = 5

/**
 * Rating under a pointer, given how far across the star row it is (0 = left edge, 1 = right edge).
 * The row is five equal cells with each star centred in its cell, so the left half of a star gives
 * x.5 and the right half gives the whole number — which is what "fill half a star at a time" needs.
 * Touching the row at all is never less than half a star.
 */
export function ratingAtFraction(fraction: number): number {
  if (!Number.isFinite(fraction)) return MIN_RATING
  const f = Math.min(1, Math.max(0, fraction))
  // The epsilon keeps an exact boundary (e.g. 0.2 * 2 + 0.1 = 0.30000000000000004) on the lower half-step.
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.ceil(f * 10 - 1e-9) / 2))
}

/** How much of star `index` (0-based) is filled for a rating, 0..1. */
export function starFill(rating: number, index: number): number {
  return Math.min(1, Math.max(0, rating - index))
}

/** One keyboard step (±0.5), kept inside the valid range; from "no rating" an up-step lands on 0.5. */
export function stepRating(rating: number, direction: 1 | -1): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating + direction * 0.5))
}

/** The word under the stars. */
export function ratingLabel(rating: number): string {
  if (rating <= 0) return ''
  if (rating <= 1) return 'Poor'
  if (rating <= 2) return 'Fair'
  if (rating <= 3) return 'Good'
  if (rating <= 4) return 'Great!'
  return 'Excellent!'
}

/** Spoken form for assistive tech, e.g. "4.5 out of 5 stars". */
export function ratingSpeech(rating: number): string {
  return rating > 0 ? `${rating} out of 5 stars` : 'No rating yet'
}
