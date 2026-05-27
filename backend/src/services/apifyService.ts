import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;

export async function processApifyDataset(datasetId: string) {
  if (!APIFY_TOKEN) {
    logger.error('APIFY_TOKEN is missing');
    throw new Error('APIFY_TOKEN is missing');
  }

  logger.info(`Fetching Apify dataset: ${datasetId}`);
  const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
  
  if (!response.ok) {
    logger.error(`Failed to fetch Apify dataset: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch Apify dataset: ${response.statusText}`);
  }

  const items = await response.json() as any[];
  logger.info(`Processing ${items.length} items from Apify dataset`);

  let enrichedCount = 0;

  for (const item of items) {
    // Try to find venue ID from searchString
    let venueId: number | null = null;
    
    const searchString = item.searchString || '';
    const idMatch = searchString.match(/#ID:(\d+)/);
    if (idMatch) {
      venueId = parseInt(idMatch[1]);
    }

    if (!venueId) {
      logger.warn(`Could not determine venue ID for item: ${item.title || item.searchString}. Skipping.`);
      continue;
    }

    try {
      const cleanPhone = item.phone ? item.phone.replace(/\s+/g, '') : null;
      
      // Extract rich data
      const openingHours = item.openingHours ? JSON.stringify(item.openingHours) : null;
      const images = (item.imageUrls && Array.isArray(item.imageUrls)) ? item.imageUrls.slice(0, 5) : null;
      
      // Closure detection
      // Apify's Google Places Crawler usually returns isClosed: boolean or permanentlyClosed: boolean
      const isPermanentlyClosed = item.isClosed === true || item.permanentlyClosed === true;

      // Extract deep enrichment data (emails)
      const email = (item.emails && Array.isArray(item.emails) && item.emails.length > 0) 
        ? item.emails[0] 
        : (item.email || null);

      await db.query(
        `UPDATE venues 
         SET website = CASE WHEN NULLIF($1::text, '') IS NOT NULL THEN $1 ELSE website END,
             phone = CASE WHEN NULLIF($2::text, '') IS NOT NULL THEN $2 ELSE phone END,
             rating = COALESCE($3, rating),
             user_ratings_total = COALESCE($4, user_ratings_total),
             opening_hours = CASE WHEN NULLIF($5::text, '') IS NOT NULL THEN $5 ELSE opening_hours END,
             images = CASE WHEN $6::text[] IS NOT NULL AND array_length($6::text[], 1) > 0 THEN $6 ELSE images END,
             email = CASE WHEN NULLIF($7::text, '') IS NOT NULL THEN $7 ELSE email END,
             is_active = CASE WHEN $8 = TRUE THEN FALSE ELSE is_active END,
             enriched_at = NOW()
         WHERE id = $9`,
        [
          item.website || null,
          cleanPhone,
          item.totalScore || null,
          item.reviewsCount || null,
          openingHours,
          item.imageUrls || images,
          email,
          isPermanentlyClosed,
          venueId
        ]
      );
      
      if (isPermanentlyClosed) {
        logger.warn({ venueId, name: item.title }, 'Venue marked as inactive due to permanent closure reported by Apify');
      }

      enrichedCount++;
      logger.info(`Enriched venue ID ${venueId} from Apify webhook`);
    } catch (err) {
      logger.error({ err, venueId }, 'Error updating venue from Apify data');
    }
  }

  logger.info(`Apify dataset processing complete. Enriched ${enrichedCount} venues.`);
  return { enrichedCount };
}
