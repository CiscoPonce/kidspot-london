import { describe, it, expect } from 'vitest';
import { scorePlaceMatch } from '../../services/foursquareService.js';

describe('scorePlaceMatch', () => {
  it('returns high score for exact name match', () => {
    const score = scorePlaceMatch('Better Gym London', {
      fsq_place_id: '1',
      latitude: 51.5,
      longitude: -0.1,
      name: 'Better Gym London',
      distance: 50,
    });
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns low score for distant unrelated place', () => {
    const score = scorePlaceMatch('Kidzania London', {
      fsq_place_id: '2',
      latitude: 51.5,
      longitude: -0.1,
      name: 'Random Coffee Shop',
      distance: 800,
    });
    expect(score).toBeLessThan(0.45);
  });

  it('returns moderate score for partial name overlap nearby', () => {
    const score = scorePlaceMatch('The Gym @ LikeMinds Club', {
      fsq_place_id: '3',
      latitude: 51.5,
      longitude: -0.1,
      name: 'The Gym Group',
      distance: 100,
    });
    expect(score).toBeGreaterThan(0.3);
  });
});
