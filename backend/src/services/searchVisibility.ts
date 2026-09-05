/**
 * Public-search visibility helpers.
 * Rows stay in Postgres; these only decide what the parent-facing API returns.
 */

export const SEARCH_CACHE_VERSION = 'p3';

export interface SearchVenueLike {
  id: string | number;
  name: string;
  lat?: number | null;
  lon?: number | null;
  scope_reason?: string | null;
  type?: string | null;
}

export const FAST_FOOD_NAME_RE =
  /mcdonald|burger king|pizza hut|\bkfc\b|wendy'?s/i;

export function isSuppressedSearchVenue(venue: SearchVenueLike): boolean {
  if (venue.scope_reason === 'chain_party_food') return true;
  return FAST_FOOD_NAME_RE.test(venue.name || '');
}

export function partyEligibilitySql(alias = ''): string {
  const c = alias ? `${alias}.` : '';
  return `(
    ${c}party_capable = TRUE
    OR ${c}type IN ('softplay', 'community_hall')
    OR ${c}name ILIKE '%soft play%'
    OR ${c}name ILIKE '%play centre%'
    OR ${c}name ILIKE '%trampoline%'
  )`;
}

export function searchSuppressSql(alias = ''): string {
  const c = alias ? `${alias}.` : '';
  return `(
    COALESCE(${c}scope_reason, '') <> 'chain_party_food'
    AND ${c}name !~* '(mcdonald|burger king|pizza hut)'
    AND COALESCE(${c}liveness_status, 'unknown') <> 'gone'
  )`;
}

export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|london|uk|ltd|limited|cic)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function venueDedupeKey(venue: SearchVenueLike): string {
  const name = normalizeVenueName(venue.name || '');
  const lat = venue.lat != null ? Number(venue.lat).toFixed(3) : '';
  const lon = venue.lon != null ? Number(venue.lon).toFixed(3) : '';
  return `${name}|${lat}|${lon}`;
}

export function dedupeSearchVenues<T extends SearchVenueLike>(
  venues: T[],
  limit: number
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const venue of venues) {
    if (isSuppressedSearchVenue(venue)) continue;
    const key = venueDedupeKey(venue);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(venue);
    if (out.length >= limit) break;
  }
  return out;
}

export function searchFetchLimit(limit: number): number {
  return Math.min(100, Math.max(limit, limit * 2));
}
