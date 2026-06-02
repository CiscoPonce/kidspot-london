import { describe, it, expect } from 'vitest';
import { crawlDelay } from '../../utils/rateLimiter.js';

describe('rateLimiter.ts (Phase 18B)', () => {
  it('returns a Promise', async () => {
    expect(crawlDelay(100)).toBeInstanceOf(Promise);
  });

  it('resolves within expected window for small baseMs', async () => {
    const start = Date.now();
    await crawlDelay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(300);
  });

  it('resolves within expected window for 800ms base', async () => {
    const start = Date.now();
    await crawlDelay(800);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(650);
    expect(elapsed).toBeLessThan(1000);
  });

  it('applies jitter — at least two distinct durations across multiple runs', async () => {
    const durations: number[] = [];
    for (let i = 0; i < 6; i++) {
      const start = Date.now();
      await crawlDelay(600);
      durations.push(Date.now() - start);
    }
    const unique = new Set(durations.map((d) => Math.round(d / 30) * 30));
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});
