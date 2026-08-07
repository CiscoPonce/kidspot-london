import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { browserHeaders } from '../../../src/utils/httpHeaders.js';

export interface WikimediaEnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Wikimedia Commons Geolocation & Search Image Enrichment (100% Free, No API Key Required)
 */
export async function enrichViaWikimedia(limit: number = 30): Promise<WikimediaEnrichmentResult> {
  const result: WikimediaEnrichmentResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    const { rows: venues } = await db.query(
      `SELECT id, name, type, lat, lon, borough, postcode
       FROM venues
       WHERE is_active = TRUE
         AND (images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0)
       ORDER BY
         CASE type
           WHEN 'park' THEN 1
           WHEN 'museum' THEN 2
           WHEN 'leisure_centre' THEN 3
           WHEN 'community_hall' THEN 4
           WHEN 'library' THEN 5
           ELSE 6
         END,
         kid_score DESC NULLS LAST, id ASC
       LIMIT $1`,
      [limit]
    );

    if (venues.length === 0) {
      logger.info('No venues require Wikimedia image enrichment.');
      return result;
    }

    logger.info(`Wikimedia Images: ${venues.length} venues to process.`);

    for (const venue of venues) {
      result.totalProcessed++;
      let imageUrl: string | null = null;

      try {
        // Strategy 1: Search by exact venue name + London on Wikimedia Commons
        const searchQuery = `${venue.name} London`;
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&srlimit=3&format=json`;

        const searchRes = await fetch(searchUrl, { headers: browserHeaders() });
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as any;
          const searchResults = searchData?.query?.search || [];

          for (const item of searchResults) {
            const title = item.title; // e.g. "File:Battersea Park entrance.jpg"
            if (title && (title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.png'))) {
              // Fetch image URL for title
              const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
              const infoRes = await fetch(infoUrl, { headers: browserHeaders() });
              if (infoRes.ok) {
                const infoData = (await infoRes.json()) as any;
                const pages = infoData?.query?.pages || {};
                const page = Object.values(pages)[0] as any;
                const url = page?.imageinfo?.[0]?.url;
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                  imageUrl = url;
                  break;
                }
              }
            }
          }
        }

        // Strategy 2: If no title match, try geosearch if coordinates exist
        if (!imageUrl && venue.lat && venue.lon) {
          const geoUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggsprimary=all&ggsnamespace=6&ggsradius=300&ggscoord=${venue.lat}|${venue.lon}&prop=imageinfo&iiprop=url&format=json`;
          const geoRes = await fetch(geoUrl, { headers: browserHeaders() });
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as any;
            const pages = geoData?.query?.pages || {};
            for (const p of Object.values(pages) as any[]) {
              const url = p?.imageinfo?.[0]?.url;
              if (url && (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png'))) {
                imageUrl = url;
                break;
              }
            }
          }
        }

        if (imageUrl) {
          await db.query(
            `UPDATE venues SET images = ARRAY[$1::text], enriched_at = NOW() WHERE id = $2`,
            [imageUrl, venue.id]
          );
          logger.info(`  ✓ Wikimedia found image for "${venue.name}": ${imageUrl}`);
          result.enriched++;
        } else {
          result.skipped++;
        }
      } catch (err: any) {
        logger.error({ err: err.message, venueId: venue.id }, 'Wikimedia enrichment failed');
        result.failed++;
      }

      // Respect API guidelines
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error: any) {
    logger.error({ err: error.message }, 'Wikimedia image enrichment error');
    throw error;
  }

  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 100;
  enrichViaWikimedia(limit)
    .then(res => {
      logger.info(res, 'Wikimedia image enrichment complete');
      process.exit(0);
    })
    .catch(err => {
      logger.error(err);
      process.exit(1);
    });
}
