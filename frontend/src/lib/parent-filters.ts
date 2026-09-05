import type { Venue } from './api';

export type CateringFilter = 'any' | 'byo' | 'included';

/** Only explicit extracted values — type is not proof. */
export function venueAllowsByoFood(venue: Venue): boolean {
  return venue.byo_food_allowed === true;
}

export function venueIncludesFood(venue: Venue): boolean {
  return venue.food_provided === true;
}

/** Parent filters: guest count and confirmed cake/food policy only. */
export function matchesParentFilters(
  venue: Venue,
  kidsCount: number | null,
  catering: CateringFilter
): boolean {
  if (
    kidsCount != null &&
    venue.party_max_capacity != null &&
    venue.party_max_capacity < kidsCount
  ) {
    return false;
  }
  if (catering === 'byo' && !venueAllowsByoFood(venue)) return false;
  if (catering === 'included' && !venueIncludesFood(venue)) return false;
  return true;
}
