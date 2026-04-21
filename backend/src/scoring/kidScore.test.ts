import { describe, it, expect } from 'vitest';
import { calculateKidScore } from './kidScore';

describe('calculateKidScore', () => {
  it('should return 0 for disqualifying types (Test 1)', () => {
    const venue = {
      name: 'The Rusty Nail',
      types: ['bar', 'park'],
      rating: 4.5,
      user_ratings_total: 100
    };
    expect(calculateKidScore(venue)).toBe(0);
  });

  it('should return correct base weight for softplay (Test 2)', () => {
    const venue = {
      name: 'Generic Venue',
      types: ['softplay'],
    };
    // base 10 + 0 boost + 0 rating = 10
    expect(calculateKidScore(venue)).toBe(10);
  });

  it('should return correct base weight for park (Test 2)', () => {
    const venue = {
      name: 'Generic Venue',
      types: ['park'],
    };
    // base 8 + 0 boost + 0 rating = 8
    expect(calculateKidScore(venue)).toBe(8);
  });

  it('should apply keyword boosts (Test 3)', () => {
    const venue = {
      name: 'Amazing Birthday Party Play Center',
      types: ['community_hall'],
    };
    // base 6 + boost(birthday:2, party:2, play:1) = 11
    expect(calculateKidScore(venue)).toBe(11);
  });

  it('should apply rating adjustments (Test 4)', () => {
    const venue = {
      name: 'Good Park',
      types: ['park'],
      rating: 5,
      user_ratings_total: 10
    };
    // base 8 + rating adjustment (5/5)*2 = 10
    expect(calculateKidScore(venue)).toBe(10);
  });

  it('should not apply rating adjustment if total ratings <= 5 (Test 4)', () => {
    const venue = {
      name: 'New Park',
      types: ['park'],
      rating: 5,
      user_ratings_total: 5
    };
    // base 8 + 0 adjustment = 8
    expect(calculateKidScore(venue)).toBe(8);
  });

  it('should cap the score at 20 (Test 5)', () => {
    const venue = {
      name: 'Super Birthday Party Kids Children Family Play Softplay Park',
      types: ['softplay', 'park'],
      rating: 5,
      user_ratings_total: 100
    };
    // base 10 + boost(birthday:2, party:2, kids:1, children:1, family:1, play:1) = 18
    // + rating adjustment (5/5)*2 = 20
    // Total 20. If I add more, it should still be 20.
    expect(calculateKidScore(venue)).toBe(20);
  });

  it('should handle venues with no matching types (other)', () => {
    const venue = {
      name: 'Library',
      types: ['library'],
    };
    // base 2 (other)
    expect(calculateKidScore(venue)).toBe(2);
  });
});
