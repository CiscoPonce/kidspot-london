/**
 * Shared rate limiter with jitter for BullMQ job processors.
 *
 * crawlDelay(baseMs) resolves after baseMs + random(-100, +150) ms
 * to disrupt bot-fingerprint timing patterns.
 *
 * Usage:
 *   await crawlDelay(800); // resolves after ~700-950ms
 */

/**
 * Jittered crawl delay.
 * @param baseMs - Base delay in milliseconds.
 * @returns Promise that resolves after baseMs + random(-100, +150) ms.
 */
export async function crawlDelay(baseMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 250) - 100; // -100 to +150
  const delay = baseMs + jitter;
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}
