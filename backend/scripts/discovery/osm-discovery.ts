import axios from 'axios';
import { db } from '../../src/clients/db.js';
import { logger } from '../../src/config/logger.js';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Map OSM tags to our venue types
function mapVenueType(tags: Record<string, string>): string {
  const typeMap: Record<string, string> = {
    'leisure=indoor_play': 'softplay',
    'amenity=community_centre': 'community_hall',
    'leisure=park': 'park',
    'leisure=playground': 'park',
    'leisure=stadium': 'other',
    'amenity=gym': 'other'
  };
  
  for (const [tagKey, venueType] of Object.entries(typeMap)) {
    const [key, value] = tagKey.split('=');
    if (tags[key] === value) {
      return venueType;
    }
  }
  
  return 'other';
}

const OSM_QUERIES = [
  {
    name: 'softplay',
    query: `
      [out:json][timeout:300];
      (
        node["leisure"="indoor_play"](51.2,-0.5,51.7,0.3);
        way["leisure"="indoor_play"](51.2,-0.5,51.7,0.3);
        relation["leisure"="indoor_play"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  },
  {
    name: 'community_hall',
    query: `
      [out:json][timeout:300];
      (
        node["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
        way["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
        relation["amenity"="community_centre"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  },
  {
    name: 'park',
    query: `
      [out:json][timeout:300];
      (
        node["leisure"="park"](51.2,-0.5,51.7,0.3);
        way["leisure"="park"](51.2,-0.5,51.7,0.3);
        relation["leisure"="park"](51.2,-0.5,51.7,0.3);
      );
      out center;
    `
  }
];

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

async function upsertOSMVenue(venue: any, venueType: string) {
  try {
    const name = venue.tags?.name || `OSM ${venue.id}`;
    const slug = `${slugify(name)}-osm-${venue.id}`;

    await db.query(
      `INSERT INTO venues (
        source, source_id, name, type, lat, lon, slug, last_scraped, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE)
      ON CONFLICT (source, source_id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        last_scraped = NOW(),
        is_active = TRUE`,
      [
        'osm',
        venue.id.toString(),
        name,
        venueType,
        venue.lat,
        venue.lon,
        slug
      ]
    );
    return { status: 'upserted' };
  } catch (error: any) {
    logger.error({ err: error, osmId: venue.id }, 'Error upserting OSM venue');
    return { status: 'error' };
  }
}

async function queryOverpass(query: string) {
  try {
    const minifiedQuery = query.replace(/\s+/g, ' ').trim();
    const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(minifiedQuery)}`, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'KidSpotLondon/1.0'
      },
      timeout: 60000
    });
    return response.data?.elements || [];
  } catch (error: any) {
    logger.error({ err: error.message || error }, 'Overpass API query failed');
    return [];
  }
}

export async function discoverVenuesFromOSM() {
  logger.info('Starting OSM discovery for London...');
  
  let totalProcessed = 0;
  let totalUpserted = 0;
  
  try {
    for (const queryConfig of OSM_QUERIES) {
      logger.info({ category: queryConfig.name }, 'Querying Overpass...');
      const elements = await queryOverpass(queryConfig.query);
      logger.info({ category: queryConfig.name, count: elements.length }, 'Overpass returned elements');
      
      for (const element of elements) {
        totalProcessed++;
        
        let lat, lon;
        if (element.lat && element.lon) {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        } else continue;

        const venue = {
          id: element.id,
          lat,
          lon,
          tags: element.tags || {}
        };
        
        const venueType = mapVenueType(venue.tags);
        const res = await upsertOSMVenue(venue, venueType);
        if (res.status === 'upserted') totalUpserted++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logger.info({ totalProcessed, totalUpserted }, 'OSM discovery complete');
  } catch (error: any) {
    logger.error({ err: error }, 'Fatal error during OSM discovery');
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  discoverVenuesFromOSM()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error({ err: error }, 'Fatal error');
      process.exit(1);
    });
}
