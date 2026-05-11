import { db } from '../../../src/clients/db.js';

export interface WebScraperResult {
  enriched: number;
  skipped: number;
  failed: number;
}

// Common booking platform patterns
const BOOKING_PATTERNS = [
  /eventbrite\.co\.uk/i,
  /eventbrite\.com/i,
  /bookwhen\.com/i,
  /classforKids\.com/i,
  /class4kids\.co\.uk/i,
  /hoop\.co\.uk/i,
  /better\.org\.uk.*book/i,
  /everyoneactive\.com.*book/i,
  /clubspark\.com/i,
];

// Phone number regex for UK numbers
const PHONE_REGEX = /(?:(?:\+44\s?|0)(?:\d[\s.-]?){9,10})/g;

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Web Scraper Enrichment Pipeline (Layer 2)
 *
 * For high-value venues (softplays, leisure centres, museums) that are still
 * missing a website after OSM enrichment:
 * 1. Use Brave Search API to find the official website URL
 * 2. Fetch the homepage and /contact page
 * 3. Extract email, phone, and booking URLs
 */
export async function enrichViaWebScraping(batchSize: number = 10): Promise<WebScraperResult> {
  const result: WebScraperResult = { enriched: 0, skipped: 0, failed: 0 };

  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_API_KEY) {
    console.log('Web scraper skipped: BRAVE_API_KEY not configured.');
    return result;
  }

  try {
    // Target high-value venues missing website data
    const { rows: venues } = await db.query(
      `SELECT id, name, type, borough, lat, lon FROM venues
       WHERE is_active = TRUE
         AND (website IS NULL OR website = '')
         AND type IN ('softplay', 'leisure_centre', 'museum', 'library')
       ORDER BY
         CASE type
           WHEN 'softplay' THEN 1
           WHEN 'leisure_centre' THEN 2
           WHEN 'museum' THEN 3
           WHEN 'library' THEN 4
         END,
         id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (venues.length === 0) {
      console.log('No high-value venues left to scrape.');
      return result;
    }

    console.log(`Found ${venues.length} high-value venues to scrape.`);

    for (const venue of venues) {
      try {
        // Rate limit Brave Search
        await new Promise(resolve => setTimeout(resolve, 1500));

        const location = venue.borough || 'London';
        const searchQuery = `${venue.name} ${location} UK`;

        console.log(`  Searching: "${searchQuery}"...`);

        const braveRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': BRAVE_API_KEY
            }
          }
        );

        if (!braveRes.ok) {
          if (braveRes.status === 429) {
            console.warn('  Brave API rate limited — stopping.');
            break;
          }
          console.warn(`  Brave returned ${braveRes.status} — skipping.`);
          result.failed++;
          continue;
        }

        const braveData = await braveRes.json() as any;
        const webResults = braveData?.web?.results || [];

        if (webResults.length === 0) {
          result.skipped++;
          continue;
        }

        // Pick the first result that looks like an official site (not a directory)
        const DIRECTORY_DOMAINS = /(yelp\.|tripadvisor\.|facebook\.|instagram\.|twitter\.|youtube\.|mumsnet\.|timeout\.|reddit\.|wikipedia\.|linkedin\.)/i;
        const officialResult = webResults.find((r: any) => {
          const domain = r.meta_url?.domain || '';
          return !DIRECTORY_DOMAINS.test(domain);
        });

        if (!officialResult) {
          result.skipped++;
          continue;
        }

        const websiteUrl = officialResult.url;
        let phone: string | null = null;
        let email: string | null = null;
        let bookingUrl: string | null = null;

        // Try to fetch the homepage for contact info
        try {
          const pageRes = await fetch(websiteUrl, {
            headers: { 'User-Agent': 'KidSpot-London/1.0 (venue-enrichment)' },
            signal: AbortSignal.timeout(10000),
            redirect: 'follow'
          });

          if (pageRes.ok) {
            const html = await pageRes.text();

            // Extract phone numbers
            const phones = html.match(PHONE_REGEX);
            if (phones && phones.length > 0) {
              phone = phones[0].replace(/[\s.-]/g, '').trim();
            }

            // Extract emails (filter out common junk)
            const emails = html.match(EMAIL_REGEX);
            if (emails) {
              const validEmail = emails.find(e =>
                !e.includes('example.com') &&
                !e.includes('sentry.io') &&
                !e.includes('wixpress') &&
                !e.includes('wordpress') &&
                !e.endsWith('.png') &&
                !e.endsWith('.jpg')
              );
              if (validEmail) email = validEmail;
            }

            // Check for booking platform links
            const hrefMatches = html.match(/href="([^"]+)"/g) || [];
            for (const href of hrefMatches) {
              const url = href.replace('href="', '').replace('"', '');
              if (BOOKING_PATTERNS.some(pattern => pattern.test(url))) {
                bookingUrl = url;
                break;
              }
            }
          }
        } catch (fetchErr: any) {
          console.warn(`  Could not fetch ${websiteUrl}: ${fetchErr.message}`);
        }

        // Also try /contact page
        try {
          const contactUrl = new URL('/contact', websiteUrl).href;
          const contactRes = await fetch(contactUrl, {
            headers: { 'User-Agent': 'KidSpot-London/1.0 (venue-enrichment)' },
            signal: AbortSignal.timeout(10000),
            redirect: 'follow'
          });

          if (contactRes.ok) {
            const html = await contactRes.text();

            if (!phone) {
              const phones = html.match(PHONE_REGEX);
              if (phones && phones.length > 0) {
                phone = phones[0].replace(/[\s.-]/g, '').trim();
              }
            }

            if (!email) {
              const emails = html.match(EMAIL_REGEX);
              if (emails) {
                const validEmail = emails.find(e =>
                  !e.includes('example.com') &&
                  !e.includes('sentry.io') &&
                  !e.includes('wixpress')
                );
                if (validEmail) email = validEmail;
              }
            }
          }
        } catch {
          // /contact page doesn't exist or failed — that's fine
        }

        // Update the venue
        await db.query(
          `UPDATE venues SET
             website = COALESCE(NULLIF($1, ''), website),
             phone = COALESCE(NULLIF($2, ''), phone),
             email = COALESCE(NULLIF($3, ''), email),
             booking_url = COALESCE(NULLIF($4, ''), booking_url),
             contact_enriched_at = NOW()
           WHERE id = $5`,
          [websiteUrl, phone, email, bookingUrl, venue.id]
        );

        console.log(`  ✓ ${venue.name}: web=${websiteUrl} ph=${!!phone} em=${!!email} book=${!!bookingUrl}`);
        result.enriched++;
      } catch (err: any) {
        console.error(`  Failed to scrape ${venue.name}:`, err.message);
        result.failed++;
      }
    }
  } catch (err: any) {
    console.error('Web scraper pipeline error:', err.message);
    throw err;
  }

  return result;
}
