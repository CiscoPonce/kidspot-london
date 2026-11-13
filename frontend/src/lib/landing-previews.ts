import { fetchVenues, type Venue } from '@/lib/api';
import { sortVenues } from '@/lib/venue-sort';

const CENTRAL_LONDON = { lat: 51.5155, lon: -0.0922 };

/** Neon trampoline / arcade brands — older-kid energy, not the landing face. */
const TEEN_VIBE = /flip out|gravity|immersive gamebox|esports|oxygen|jump zone|activate at/i;

const FAMILY_TYPES = new Set(['softplay', 'community_hall', 'park', 'library', 'leisure_centre']);

function hasPhoto(venue: Venue): boolean {
  return Boolean(venue.image_url || (Array.isArray(venue.images) && venue.images[0]));
}

function isFamilyFace(venue: Venue): boolean {
  if (TEEN_VIBE.test(venue.name)) return false;
  if (FAMILY_TYPES.has(venue.type)) return true;
  return venue.type === 'museum';
}

/** Photographed family venues for the landing strip — no neon arcade lead-ins. */
export async function fetchLandingPreviews(): Promise<Venue[]> {
  try {
    const response = await fetchVenues(CENTRAL_LONDON.lat, CENTRAL_LONDON.lon, 10, undefined, undefined, 40);
    const venues = (response.data.all || []).filter(isFamilyFace);
    if (venues.length === 0) return [];

    const photographed = venues.filter(hasPhoto);
    const pool = photographed.length >= 3 ? photographed : venues;
    const ranked = sortVenues(pool, 'recommended', { intent: 'party', ageBand: 'under7' });

    const unique: Venue[] = [];
    const rest: Venue[] = [];
    const seenTypes = new Set<string>();

    for (const venue of ranked) {
      if (!seenTypes.has(venue.type)) {
        unique.push(venue);
        seenTypes.add(venue.type);
      } else {
        rest.push(venue);
      }
    }

    return [...unique, ...rest].slice(0, 6);
  } catch {
    return [];
  }
}
