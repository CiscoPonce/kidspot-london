import type { Venue } from './api';

export type SortMode = 'recommended' | 'nearest' | 'price';

const CHAIN_PATTERN =
  /flip out|oxygen|gambado|kidspace|gravity|inflata nation|cookie'?s island|jump zone|activate at/i;

/** Higher = better fit for a kids' birthday party search. */
export function partyScore(venue: Venue): number {
  let score = 0;
  const name = venue.name.toLowerCase();

  if (venue.type === 'softplay') score += 100;
  if (CHAIN_PATTERN.test(name)) score += 80;
  if (venue.party_capable) score += 50;
  if (venue.party_price_from != null) score += 15;
  if (venue.rating) score += venue.rating * 8;
  if (venue.sponsor_tier) score += 30;
  if (/mcdonald|burger king|wacky warehouse/.test(name)) score += 25;
  if (venue.type === 'park' && /adventure playground/.test(name)) score -= 60;
  if (venue.type === 'community_hall' && !venue.party_capable) score -= 15;
  if (venue.distance_miles != null) score -= venue.distance_miles * 2;

  return score;
}

export function sortVenues(venues: Venue[], mode: SortMode): Venue[] {
  const copy = [...venues];

  if (mode === 'nearest') {
    return copy.sort(
      (a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999)
    );
  }

  if (mode === 'price') {
    return copy.sort((a, b) => {
      const pa = a.party_price_from ?? 99999;
      const pb = b.party_price_from ?? 99999;
      if (pa !== pb) return pa - pb;
      return (a.distance_miles ?? 999) - (b.distance_miles ?? 999);
    });
  }

  return copy.sort((a, b) => partyScore(b) - partyScore(a));
}
