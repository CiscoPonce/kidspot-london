/**
 * Shared browser-grade HTTP headers for all outbound fetches.
 *
 * Mimics a real Chromium browser to reduce upstream rejections (403/406)
 * that strip contact data. The default User-Agent preserves KidSpot
 * attribution.
 *
 * Usage:
 *   const headers = browserHeaders();
 *   const headers = browserHeaders({ 'X-Custom': 'value' });
 */
export function browserHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    // Attribution retained per CE-01
    'User-Agent': 'KidSpot-London/1.0 (venue-enrichment; +https://kidspot.london)',
    // Standard browser accept headers
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,image/avif,image/webp,*/*;q=0.7',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    'Upgrade-Insecure-Requests': '1',
    // Sec-Fetch-* family (Chromium)
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    // Basic connection hint
    Connection: 'keep-alive',
  };

  if (extra) {
    Object.assign(headers, extra);
  }

  return headers;
}
