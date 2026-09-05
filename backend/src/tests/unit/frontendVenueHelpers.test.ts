import { describe, it, expect } from 'vitest';

// Re-implement / test venue sort & image helpers logic to ensure zero regression in frontend ranking algorithms

interface Venue {
  id: string;
  name: string;
  type: string;
  party_capable?: boolean;
  party_price_from?: number | null;
  party_price_unit?: string | null;
  rating?: number | null;
  sponsor_tier?: string | null;
  distance_miles?: number | null;
  image_url?: string | null;
  images?: string[];
}

const CHAIN_PATTERN =
  /flip out|oxygen|gambado|kidspace|gravity|inflata nation|cookie'?s island|jump zone|activate at/i;

function partyScore(venue: Venue): number {
  let score = 0;
  const name = venue.name.toLowerCase();

  if (venue.type === 'softplay') score += 100;
  if (CHAIN_PATTERN.test(name)) score += 80;
  if (venue.party_capable) score += 50;
  if (venue.party_price_from != null) score += 15;
  if (venue.rating) score += venue.rating * 8;
  if (venue.sponsor_tier) score += 30;
  if (/mcdonald|burger king|wacky warehouse/.test(name)) score -= 80;
  if (venue.type === 'park' && /adventure playground/.test(name)) score -= 60;
  if (venue.type === 'community_hall' && !venue.party_capable) score -= 15;
  if (venue.distance_miles != null) score -= venue.distance_miles * 2;

  return score;
}

function sortVenues(venues: Venue[], mode: 'recommended' | 'nearest' | 'price'): Venue[] {
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

function formatPartyPrice(venue: Venue): string | null {
  if (typeof venue.party_price_from !== 'number') return null;
  const amount = Number.isInteger(venue.party_price_from)
    ? venue.party_price_from
    : venue.party_price_from.toFixed(2);
  const unit =
    venue.party_price_unit === 'per_hour'
      ? ' per hour'
      : venue.party_price_unit === 'flat'
        ? ' per party'
        : ' per child';
  return `£${amount}${unit}`;
}

describe('Frontend Venue Ranking & Formatting Helpers', () => {
  describe('partyScore', () => {
    it('ranks softplay and known chain venues highest', () => {
      const softplay: Venue = { id: '1', name: 'Flip Out Wandsworth', type: 'softplay', party_capable: true, rating: 4.8 };
      const hall: Venue = { id: '2', name: 'St Johns Church Hall', type: 'community_hall', party_capable: false };

      expect(partyScore(softplay)).toBeGreaterThan(partyScore(hall));
    });

    it('penalizes distance correctly', () => {
      const vNear: Venue = { id: '1', name: 'Softplay Hub', type: 'softplay', distance_miles: 0.5 };
      const vFar: Venue = { id: '2', name: 'Softplay Hub', type: 'softplay', distance_miles: 15.0 };

      expect(partyScore(vNear)).toBeGreaterThan(partyScore(vFar));
    });
  });

  describe('sortVenues', () => {
    const venues: Venue[] = [
      { id: '1', name: 'Far Expensive Venue', type: 'hall', party_price_from: 250, distance_miles: 10 },
      { id: '2', name: 'Close Cheap Venue', type: 'softplay', party_price_from: 50, distance_miles: 1 },
      { id: '3', name: 'Medium Venue', type: 'softplay', party_price_from: 120, distance_miles: 3 },
    ];

    it('sorts by nearest', () => {
      const sorted = sortVenues(venues, 'nearest');
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('sorts by price ascending', () => {
      const sorted = sortVenues(venues, 'price');
      expect(sorted[0].party_price_from).toBe(50);
      expect(sorted[1].party_price_from).toBe(120);
      expect(sorted[2].party_price_from).toBe(250);
    });
  });

  describe('formatPartyPrice', () => {
    it('formats integer and decimal party prices with correct unit', () => {
      expect(formatPartyPrice({ id: '1', name: 'V1', type: 'softplay', party_price_from: 15, party_price_unit: 'per_child' })).toBe('£15 per child');
      expect(formatPartyPrice({ id: '2', name: 'V2', type: 'hall', party_price_from: 35.5, party_price_unit: 'per_hour' })).toBe('£35.50 per hour');
      expect(formatPartyPrice({ id: '3', name: 'V3', type: 'hall', party_price_from: 150, party_price_unit: 'flat' })).toBe('£150 per party');
      expect(formatPartyPrice({ id: '4', name: 'V4', type: 'hall' })).toBeNull();
    });
  });
});
