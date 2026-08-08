import * as cheerio from 'cheerio';
import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { browserHeaders } from '../../../src/utils/httpHeaders.js';

export interface WebsiteImageResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

const REJECT_IMAGE_PATTERNS = [
  /\.svg/i,
  /\.ico/i,
  /base64/i,
  /logo/i,
  /icon/i,
  /avatar/i,
  /badge/i,
  /tracking/i,
  /pixel/i,
  /facebook/i,
  /twitter/i,
  /instagram/i,
  /linkedin/i,
  /youtube/i,
  /tripadvisor/i,
  /google-map/i,
  /wikimedia\.org/i,
  /geograph\.org/i,
  /staticmap/i,
];

export function normalizeImageUrl(rawSrc: string, baseUrl: string): string | null {
  if (!rawSrc || typeof rawSrc !== 'string') return null;
  const src = rawSrc.trim();

  try {
    const absolute = new URL(src, baseUrl).href;
    const lower = absolute.toLowerCase();

    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      return null;
    }

    for (const pattern of REJECT_IMAGE_PATTERNS) {
      if (pattern.test(lower)) {
        return null;
      }
    }

    return absolute;
  } catch {
    return null;
  }
}

export async function extractImagesFromWebsite(websiteUrl: string): Promise<string[]> {
  const images: string[] = [];

  try {
    const res = await fetch(websiteUrl, {
      headers: {
        ...browserHeaders(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });

    if (!res.ok) return images;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Meta OG / Twitter images (highest priority)
    const metaOg = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="og:image"]').attr('content') ||
                   $('meta[property="twitter:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('link[rel="image_src"]').attr('href');

    if (metaOg) {
      const norm = normalizeImageUrl(metaOg, websiteUrl);
      if (norm) images.push(norm);
    }

    // 2. High relevance <img> tags (hero, banner, gallery, main content)
    $('header img, .hero img, .banner img, #hero img, #main img, main img, .gallery img, article img').each((_, el) => {
      if (images.length >= 5) return;
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset')?.split(' ')[0];
      if (src) {
        const norm = normalizeImageUrl(src, websiteUrl);
        if (norm && !images.includes(norm)) {
          images.push(norm);
        }
      }
    });

    // 3. Any prominent <img> tag on page if still empty
    if (images.length === 0) {
      $('img').each((_, el) => {
        if (images.length >= 3) return;
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          const norm = normalizeImageUrl(src, websiteUrl);
          if (norm && !images.includes(norm)) {
            images.push(norm);
          }
        }
      });
    }

  } catch (err: any) {
    // Timeout or network error
  }

  return Array.from(new Set(images));
}

export async function enrichWebsiteImages(batchSize: number = 250, force: boolean = false): Promise<WebsiteImageResult> {
  const result: WebsiteImageResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    const query = force
      ? `SELECT id, name, website, images FROM venues
         WHERE is_active = TRUE
           AND website IS NOT NULL AND website != ''
           AND (party_capable = TRUE OR type IN ('softplay', 'community_hall', 'leisure_centre'))
         ORDER BY (CASE WHEN type = 'softplay' THEN 1 WHEN party_capable = TRUE THEN 2 ELSE 3 END), id ASC
         LIMIT $1`
      : `SELECT id, name, website, images FROM venues
         WHERE is_active = TRUE
           AND website IS NOT NULL AND website != ''
           AND (party_capable = TRUE OR type IN ('softplay', 'community_hall', 'leisure_centre'))
           AND (images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0)
         ORDER BY (CASE WHEN type = 'softplay' THEN 1 WHEN party_capable = TRUE THEN 2 ELSE 3 END), id ASC
         LIMIT $1`;

    const { rows: venues } = await db.query(query, [batchSize]);

    if (venues.length === 0) {
      logger.info('No venues found needing website image enrichment.');
      return result;
    }

    result.totalProcessed = venues.length;
    logger.info(`Starting website image enrichment for ${venues.length} venues...`);

    // Concurrency control: batch of 15 at a time
    const CONCURRENCY = 15;
    for (let i = 0; i < venues.length; i += CONCURRENCY) {
      const chunk = venues.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (venue) => {
          try {
            const extracted = await extractImagesFromWebsite(venue.website);
            if (extracted.length > 0) {
              await db.query(
                `UPDATE venues SET images = $1, enriched_at = NOW() WHERE id = $2`,
                [extracted, venue.id]
              );
              result.enriched++;
              logger.info(`Extracted ${extracted.length} image(s) for "${venue.name}" (${venue.website})`);
            } else {
              result.skipped++;
            }
          } catch (e) {
            result.failed++;
          }
        })
      );
    }

    logger.info(`Website image enrichment finished. Enriched: ${result.enriched}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
  } catch (error) {
    logger.error('Error during website image enrichment:', error);
  }

  return result;
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('website-image-enrichment.ts') || process.argv[1]?.endsWith('website-image-enrichment.js')) {
  const forceArg = process.argv.includes('--force');
  enrichWebsiteImages(300, forceArg).then((res) => {
    console.log(`Finished enrichment:`, res);
    process.exit(0);
  }).catch((err) => {
    console.error('Failed to run website image enrichment:', err);
    process.exit(1);
  });
}
