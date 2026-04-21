import { describe, it, expect } from 'vitest';
import { searchQuerySchema } from './searchSchema';

describe('searchQuerySchema', () => {
  it('validates valid search parameters correctly', () => {
    const result = searchQuerySchema.safeParse({
      lat: '51.5074',
      lon: '-0.1278',
      radius_miles: '5',
      type: 'park',
      borough: 'camden'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        lat: 51.5074,
        lon: -0.1278,
        radius_miles: 5,
        type: 'park',
        borough: 'camden'
      });
    }
  });

  it('rejects missing required parameters (lat, lon)', () => {
    const result1 = searchQuerySchema.safeParse({ lon: '-0.1278' });
    expect(result1.success).toBe(false);

    const result2 = searchQuerySchema.safeParse({ lat: '51.5074' });
    expect(result2.success).toBe(false);

    const result3 = searchQuerySchema.safeParse({});
    expect(result3.success).toBe(false);
  });

  it('rejects invalid types or out-of-bounds coordinates', () => {
    const result1 = searchQuerySchema.safeParse({ lat: 'invalid', lon: '-0.1278' });
    expect(result1.success).toBe(false);

    const result2 = searchQuerySchema.safeParse({ lat: '91', lon: '-0.1278' }); // out of bounds lat
    expect(result2.success).toBe(false);

    const result3 = searchQuerySchema.safeParse({ lat: '51.5074', lon: '181' }); // out of bounds lon
    expect(result3.success).toBe(false);

    const result4 = searchQuerySchema.safeParse({ lat: '51.5074', lon: '-0.1278', radius_miles: '-1' }); // negative radius
    expect(result4.success).toBe(false);
  });
});
