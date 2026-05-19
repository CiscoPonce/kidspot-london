import { db } from '../../../src/clients/db.js';
import { yelpService, YelpBusiness } from '../../../src/services/yelpService.js';
import { logger } from '../../../src/config/logger.js';
import env from '../../../src/config/env.js';

interface BoroughInfo {
  name: string;
  lat: number;
  lon: number;
}

// 32 London Boroughs + City of London with their center coordinates
const LONDON_BOROUGHS: BoroughInfo[] = [
  { name: 'City of London', lat: 51.5155, lon: -0.0922 },
  { name: 'Westminster', lat: 51.4975, lon: -0.1357 },
  { name: 'Kensington and Chelsea', lat: 51.5020, lon: -0.1949 },
  { name: 'Hammersmith and Fulham', lat: 51.4920, lon: -0.2229 },
  { name: 'Wandsworth', lat: 51.4567, lon: -0.1910 },
  { name: 'Lambeth', lat: 51.4607, lon: -0.1163 },
  { name: 'Southwark', lat: 51.4834, lon: -0.0824 },
  { name: 'Tower Hamlets', lat: 51.5099, lon: -0.0237 },
  { name: 'Hackney', lat: 51.5450, lon: -0.0553 },
  { name: 'Islington', lat: 51.5416, lon: -0.1022 },
  { name: 'Camden', lat: 51.5290, lon: -0.1258 },
  { name: 'Brent', lat: 51.5588, lon: -0.2817 },
  { name: 'Ealing', lat: 51.5130, lon: -0.3089 },
  { name: 'Hounslow', lat: 51.4746, lon: -0.3680 },
  { name: 'Richmond upon Thames', lat: 51.4479, lon: -0.3260 },
  { name: 'Kingston upon Thames', lat: 51.4085, lon: -0.3064 },
  { name: 'Merton', lat: 51.4014, lon: -0.1958 },
  { name: 'Sutton', lat: 51.3618, lon: -0.1945 },
  { name: 'Croydon', lat: 51.3718, lon: -0.0977 },
  { name: 'Bromley', lat: 51.3550, lon: 0.0556 },
  { name: 'Lewisham', lat: 51.4452, lon: -0.0209 },
  { name: 'Greenwich', lat: 51.4892, lon: 0.0648 },
  { name: 'Bexley', lat: 51.4549, lon: 0.1505 },
  { name: 'Havering', lat: 51.5812, lon: 0.1837 },
  { name: 'Barking and Dagenham', lat: 51.5607, lon: 0.1557 },
  { name: 'Redbridge', lat: 51.5886, lon: 0.0772 },
  { name: 'Newham', lat: 51.5300, lon: 0.0200 },
  { name: 'Waltham Forest', lat: 51.5908, lon: -0.0134 },
  { name: 'Haringey', lat: 51.5900, lon: -0.1110 },
  { name: 'Enfield', lat: 51.6562, lon: -0.0800 },
  { name: 'Barnet', lat: 51.6252, lon: -0.2032 },
  { name: 'Harrow', lat: 51.5898, lon: -0.3346 },
  { name: 'Hillingdon', lat: 51.5441, lon: -0.4760 }
];

// Map Yelp categories to standard KidSpot types
const YELP_CATEGORY_MAP: Record<string, string> = {
  playgrounds: 'park',
  parks: 'park',
  communitycenters: 'community_hall',
  libraries: 'library',
  museums: 'museum',
  childrensmuseums: 'museum',
  active: 'other',
  kids_activities: 'softplay',
  softplay: 'softplay',
  recreation: 'leisure_centre',
  fitness: 'leisure_centre',
  gyms: 'leisure_centre'
};

function mapYelpSoftplayType(categories: { alias: string; title: string }[], name: string): string {
  const lowerName = name.toLowerCase();

  // Exclude obvious leisure centres or gyms
  if (lowerName.includes('gym') || lowerName.includes('leisure centre') || lowerName.includes('sports centre') || lowerName.includes('swimming pool')) {
    return 'leisure_centre';
  }

  // Softplay name matches
  if (
    lowerName.includes('soft play') ||
    lowerName.includes('softplay') ||
    lowerName.includes('play centre') ||
    lowerName.includes('play center') ||
    lowerName.includes('play barn') ||
    lowerName.includes('play zone') ||
    lowerName.includes('indoor play') ||
    lowerName.includes('role play') ||
    lowerName.includes('playcafe') ||
    lowerName.includes('play cafe')
  ) {
    return 'softplay';
  }

  // Category checks
  for (const cat of categories) {
    if (cat.alias === 'softplay' || cat.alias === 'kids_activities') {
      return 'softplay';
    }
  }

  // General mappings
  for (const cat of categories) {
    if (YELP_CATEGORY_MAP[cat.alias]) {
      return YELP_CATEGORY_MAP[cat.alias];
    }
  }

  return 'other';
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export async function runYelpGridSoftplayDiscovery() {
  logger.info('Starting Phase 17.5 Yelp Borough-Based Grid Discovery for Softplays...');

  if (!env.YELP_API_KEY) {
    logger.error('YELP_API_KEY not configured. Grid discovery skipped.');
    return { processed: 0, upserted: 0 };
  }

  const searchTerms = ['soft play', 'soft play centre', 'indoor playground'];
  let processedCount = 0;
  let upsertedCount = 0;

  for (const borough of LONDON_BOROUGHS) {
    logger.info(`Searching borough: ${borough.name}...`);

    for (const term of searchTerms) {
      try {
        // Delay to respect Yelp rate limits (5,000 free per day limits)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const businesses = await yelpService.searchBusinesses({
          term,
          latitude: borough.lat,
          longitude: borough.lon,
          radius: 5000, // 5km search radius to cover the borough thoroughly
          limit: 50
        });

        logger.info(`  Term "${term}": Found ${businesses.length} businesses.`);

        for (const business of businesses) {
          processedCount++;

          if (!business.coordinates || business.coordinates.latitude === null || business.coordinates.longitude === null) {
            continue;
          }

          const type = mapYelpSoftplayType(business.categories, business.name);
          
          // We specifically prioritize softplays or kids activities, but allow other relevant categories
          if (type !== 'softplay' && type !== 'leisure_centre' && type !== 'community_hall') {
            continue;
          }

          const slug = `${slugify(business.name)}-${business.id.slice(0, 5)}`;

          // Call the custom insert database function
          const result = await db.query(
            `SELECT insert_venue_if_not_duplicate($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS id`,
            [
              'yelp',
              business.id,
              business.name,
              type,
              business.coordinates.latitude,
              business.coordinates.longitude,
              slug,
              borough.name,
              null,
              null
            ]
          );

          const venueId = result.rows[0]?.id;

          if (venueId) {
            upsertedCount++;

            // Populate other fields returned in the search results
            const website = business.url || null;
            const phone = business.phone || business.display_phone || null;
            const rating = business.rating || null;
            const user_ratings_total = business.review_count || null;
            const imageUrls = business.image_url ? [business.image_url] : null;

            await db.query(
              `UPDATE venues SET
                 website = COALESCE(NULLIF($1, ''), website),
                 phone = COALESCE(NULLIF($2, ''), phone),
                 rating = COALESCE($3, rating),
                 user_ratings_total = COALESCE($4, user_ratings_total),
                 images = CASE WHEN $5::text[] IS NOT NULL AND images IS NULL THEN $5 ELSE images END
               WHERE id = $6`,
              [website, phone, rating, user_ratings_total, imageUrls, venueId]
            );
          }
        }
      } catch (err: any) {
        logger.error({ err, borough: borough.name, term }, 'Error searching Yelp for borough grid');
      }
    }
  }

  logger.info({ processedCount, upsertedCount }, 'Yelp Grid Softplay Discovery complete.');
  return { processed: processedCount, upserted: upsertedCount };
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  runYelpGridSoftplayDiscovery()
    .then(() => {
      logger.info('Finished Grid Softplay Ingest');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Fatal error in Grid Softplay Ingest');
      process.exit(1);
    });
}
