import { db } from '../../src/clients/db.js';
import { yelpService, YelpBusiness } from '../../src/services/yelpService.js';
import { logger } from '../../src/config/logger.js';
import env from '../../src/config/env.js';

// Venue type mappings for Yelp categories
// Yelp has very specific categories: https://www.yelp.com/developers/documentation/v3/all_category_list
const CATEGORY_MAP: Record<string, string> = {
  'playgrounds': 'park',
  'parks': 'park',
  'communitycenters': 'community_hall',
  'libraries': 'library',
  'museums': 'museum',
  'childrensmuseums': 'museum',
  'active': 'other',
  'kids_activities': 'softplay',
  'softplay': 'softplay',
  'recreation': 'leisure_centre',
  'fitness': 'leisure_centre',
  'gyms': 'leisure_centre'
};

function mapYelpCategoriesToType(categories: { alias: string; title: string }[]): string {
  for (const category of categories) {
    if (CATEGORY_MAP[category.alias]) {
      return CATEGORY_MAP[category.alias];
    }
  }
  return 'other';
}

/**
 * Generate a URL slug from venue name
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
}

/**
 * Insert or update venue discovered from Yelp
 */
async function upsertYelpVenue(business: YelpBusiness) {
  try {
    if (!business.coordinates || business.coordinates.latitude === null || business.coordinates.longitude === null) {
      logger.warn({ businessName: business.name }, 'Skipping Yelp venue due to missing coordinates');
      return { status: 'skipped', id: null };
    }

    const type = mapYelpCategoriesToType(business.categories);
    const slug = `${slugify(business.name)}-${business.id.slice(0, 5)}`;
    
    const result = await db.query(
      `INSERT INTO venues (
        source, source_id, name, type, lat, lon, slug, last_scraped, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE)
      ON CONFLICT (source, source_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        last_scraped = NOW(),
        is_active = TRUE
      RETURNING id`,
      [
        'yelp',
        business.id,
        business.name,
        type,
        business.coordinates.latitude,
        business.coordinates.longitude,
        slug
      ]
    );
    
    return { status: 'upserted', id: result.rows[0].id };
  } catch (error: any) {
    logger.error({ err: error, businessName: business.name }, 'Error upserting Yelp venue');
    return { status: 'error', id: null };
  }
}

/**
 * Discover venues in London using Yelp
 */
export async function discoverVenuesWithYelp() {
  logger.info('Starting Yelp Fusion discovery for London...');
  
  if (!env.YELP_API_KEY) {
    logger.error('YELP_API_KEY not set');
    return;
  }
  
  const searchTerms = ['soft play', 'playground', 'community centre', 'children museum', 'park', 'leisure centre'];
  const londonCenter = { lat: 51.5074, lon: -0.1278 };
  
  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalErrors = 0;
  
  try {
    for (const term of searchTerms) {
      logger.info({ term }, 'Searching Yelp...');
      
      const businesses = await yelpService.searchBusinesses({
        term,
        latitude: londonCenter.lat,
        longitude: londonCenter.lon,
        radius: 40000, // 40km
        limit: 50
      });
      
      logger.info({ term, count: businesses.length }, 'Yelp returned businesses');
      
      for (const business of businesses) {
        totalProcessed++;
        const res = await upsertYelpVenue(business);
        if (res.status === 'upserted') {
          totalUpserted++;
        } else {
          totalErrors++;
        }
      }
      
      // Delay to be nice to API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.info({
      totalProcessed,
      totalUpserted,
      totalErrors
    }, 'Yelp discovery complete');
    
  } catch (error: any) {
    logger.error({ err: error }, 'Fatal error during Yelp discovery');
  }
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  discoverVenuesWithYelp()
    .then(() => {
      logger.info('Finished');
      process.exit(0);
    })
    .catch(err => {
      logger.error({ err }, 'Fatal error');
      process.exit(1);
    });
}
