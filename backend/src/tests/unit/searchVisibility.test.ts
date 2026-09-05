import { describe, it, expect } from 'vitest';
import {
  dedupeSearchVenues,
  isSuppressedSearchVenue,
  normalizeVenueName,
  partyEligibilitySql,
  searchSuppressSql,
} from '../../services/searchVisibility';

describe('searchVisibility', () => {
  it('suppresses fast-food chains and chain_party_food', () => {
    expect(isSuppressedSearchVenue({ id: 1, name: "McDonald's - Covent Garden" })).toBe(true);
    expect(isSuppressedSearchVenue({ id: 2, name: 'Flip Out Stratford' })).toBe(false);
    expect(
      isSuppressedSearchVenue({
        id: 3,
        name: 'Beefeater',
        scope_reason: 'chain_party_food',
      })
    ).toBe(true);
  });

  it('keeps distinct sites of the same brand', () => {
    const rows = dedupeSearchVenues(
      [
        { id: 1, name: "Cookie's Island", lat: 51.576, lon: 0.066 },
        { id: 2, name: "Cookie's Island", lat: 51.515, lon: 0.055 },
        { id: 3, name: "Cookie's Island", lat: 51.5761, lon: 0.0662 },
      ],
      10
    );
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });

  it('normalizes branding noise in names', () => {
    expect(normalizeVenueName("The Gravity MAX London Ltd")).toBe('gravity max');
  });

  it('builds SQL that excludes chain party food', () => {
    expect(searchSuppressSql('v')).toContain("v.scope_reason");
    expect(searchSuppressSql('v')).toContain('liveness_status');
    expect(partyEligibilitySql()).toContain("community_hall");
    expect(partyEligibilitySql()).not.toContain('chain_party_food');
  });
});
