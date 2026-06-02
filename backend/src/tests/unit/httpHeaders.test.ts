import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browserHeaders } from '../../utils/httpHeaders.js';

describe('httpHeaders.ts (Phase 18B)', () => {
  it('is a callable function', () => {
    expect(typeof browserHeaders).toBe('function');
  });

  it('returns a header object with all required browser-grade keys', () => {
    const headers = browserHeaders();
    const keys = Object.keys(headers);
    expect(keys).toContain('User-Agent');
    expect(keys).toContain('Accept');
    expect(keys).toContain('Accept-Language');
    expect(keys.length).toBeGreaterThanOrEqual(7);
  });

  it('preserves the KidSpot attribution User-Agent', () => {
    const headers = browserHeaders();
    expect(headers['User-Agent']).toContain('KidSpot-London');
    expect(headers['User-Agent']).toContain('kidspot.london');
  });

  it('merges extra headers without overwriting defaults', () => {
    const headers = browserHeaders({ 'X-Custom': 'test' });
    expect(headers['X-Custom']).toBe('test');
    expect(headers['User-Agent']).toContain('KidSpot-London');
  });

  it('includes Sec-Fetch-* headers to mimic a real browser', () => {
    const headers = browserHeaders();
    expect(headers['Sec-Fetch-Site']).toBeDefined();
    expect(headers['Sec-Fetch-Mode']).toBeDefined();
    expect(headers['Sec-Fetch-Dest']).toBeDefined();
  });

  it('includes security headers (DNT / Upgrade-Insecure)', () => {
    const headers = browserHeaders();
    expect(headers['DNT']).toBeDefined();
    expect(headers['Upgrade-Insecure-Requests']).toBeDefined();
  });
});
