import axios from 'axios';
import { db } from '../clients/db.js';
import { redis } from '../clients/redis.js';
import { braveSearchLimiter } from '../middleware/rateLimit.js';
import { logger } from '../config/logger.js';
import { Venue, SearchQuery, SearchResponse, VenueDetailsResponse } from '../types/venue.js';
import { yelpService } from './yelpService.js';
import env from '../config/env.js';
import { calculateDistanceMiles } from '../utils/distance.js';

// Cache TTLs
const CACHE_TTL = {
  SEARCH: 3600,      // 1 hour for search results
  VENUE_DETAILS: 3600, // 1 hour for venue details
  BRAVE_FALLBACK: 3600 // 1 hour for Brave Search fallback results
};

// Helper to generate cache keys
const getSearchCacheKey = (lat?: number, lon?: number, radiusMiles?: number, type?: string, borough?: string) => {
  if (borough) {
    return `search:borough:${borough.toLowerCase().replace(/\s+/g, '_')}:${type || 'all'}`;
  }
  return `search:${lat?.toFixed(4)}:${lon?.toFixed(4)}:${radiusMiles}:${type || 'all'}`;
};

const getVenueDetailsCacheKey = (id: string | number) => {
  return `venue:${id}:details`;
};

/**
 * Fetch OSM Search results as fallback when local DB returns 0 results
 */
const fetchOsmSearchResults = async (lat: number, lon: number, radiusMiles: number, type?: string): Promise<Venue[] | null> => {
  try {
    const radiusMeters = Math.min(radiusMiles * 1609.34, 5000); // Max 5km for OSM to be fast
    let tagQuery = '';
    
    if (type === 'softplay') tagQuery = '["leisure"="indoor_play"]';
    else if (type === 'community_hall') tagQuery = '["amenity"="community_centre"]';
    else if (type === 'leisure_centre') tagQuery = '["leisure"~"sports_centre|fitness_centre"]';
    else if (type === 'park') tagQuery = '["leisure"="park"]';
    else if (type === 'library') tagQuery = '["amenity"="library"]';
    else if (type === 'museum') tagQuery = '["tourism"="museum"]';
    else if (type === 'cafe') tagQuery = '["amenity"="cafe"]';
    else tagQuery = '["leisure"~"indoor_play|park|playground|sports_centre"]';

    const query = `
      [out:json][timeout:10];
      (
        node${tagQuery}(around:${radiusMeters},${lat},${lon});
        way${tagQuery}(around:${radiusMeters},${lat},${lon});
        relation${tagQuery}(around:${radiusMeters},${lat},${lon});
      );
      out center 300;
    `.replace(/\s+/g, ' ').trim();

    logger.info({ type, lat, lon }, 'OSM Overpass fallback triggered');

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KidSpotLondon/1.0'
      },
      body: 'data=' + encodeURIComponent(query)
    });

    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }

    const responseData = await response.json() as any;

    if (responseData && responseData.elements && responseData.elements.length > 0) {
      const fallbackVenues: Venue[] = responseData.elements.map((element: any) => {
        const idStr = element.id.toString();
        const venueLat = element.lat || element.center?.lat;
        const venueLon = element.lon || element.center?.lon;
        const name = element.tags?.name || `${type ? type.replace('_', ' ') : 'Venue'} (OSM ${idStr})`;

        const features: string[] = [];
        const tags = element.tags || {};
        const nameLower = name.toLowerCase();
        const descLower = (tags.description || '').toLowerCase();

        if (tags.leisure === 'indoor_play' || tags.indoor_play === 'yes' || nameLower.includes('soft play') || nameLower.includes('play centre')) {
          features.push('soft_play');
        }
        if (tags['rooms:party'] === 'yes' || nameLower.includes('party') || descLower.includes('party') || nameLower.includes('hire') || tags.amenity === 'community_centre' || type === 'community_hall') {
          features.push('party_hire');
        }
        if (tags.amenity === 'cafe' || tags.cafe === 'yes') {
          features.push('cafe');
        }
        if (tags.wheelchair === 'yes') {
          features.push('wheelchair_accessible');
        }
        if (tags.parking === 'yes' || tags.amenity === 'parking') {
          features.push('parking');
        }

        // Add features to known leisure centres that have them
        if (type === 'leisure_centre' && (nameLower.includes('atherton') || nameLower.includes('better') || nameLower.includes('everyone active'))) {
          if (!features.includes('soft_play')) features.push('soft_play');
          if (!features.includes('party_hire')) features.push('party_hire');
          if (!features.includes('cafe')) features.push('cafe');
        }

        return {
          id: `osm_${idStr}`,
          name: name,
          type: type || 'other',
          lat: venueLat,
          lon: venueLon,
          source: 'osm',
          source_id: idStr,
          slug: `fallback-osm-${idStr}`,
          sponsor_tier: null,
          sponsor_priority: null,
          description: element.tags?.description || null,
          website: element.tags?.website || null,
          features
        };
      });      
      // Cache OSM results for details
      try {
        for (const venue of fallbackVenues) {
          const detailResponse: VenueDetailsResponse = {
            success: true,
            data: {
              basic: venue,
              details: {
                address: venue.description,
                website: venue.website,
                source: 'osm_search'
              }
            },
            meta: { is_fallback: true, cache_hit: false }
          };
          const idCacheKey = getVenueDetailsCacheKey(venue.id);
          await redis.set(idCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);
          const slugCacheKey = `venue:slug:${venue.slug}:details`;
          await redis.set(slugCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);
        }
      } catch (cacheError) {
        logger.warn({ err: cacheError }, 'Error caching OSM fallback results');
      }

      return fallbackVenues;
    }
    return null;
  } catch (error: any) {
    logger.error({ err: error.message }, 'OSM fallback error');
    return null;
  }
};

/**
 * Fetch Brave Search results as fallback when local DB returns 0 results
 */
const fetchBraveSearchResults = async (lat: number, lon: number, radiusMiles: number, type?: string, limit?: number, postcode?: string): Promise<Venue[] | null> => {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

  if (!BRAVE_API_KEY) {
    logger.info('Brave Search fallback skipped: BRAVE_API_KEY not configured');
    return null;
  }

  try {
    await braveSearchLimiter();

    const isRoughlyLondon = lat > 51.2 && lat < 51.7 && lon > -0.5 && lon < 0.3;
    let locationStr = isRoughlyLondon ? 'London UK' : 'near me';
    if (postcode) {
      // Ensure postcode has space to help search engine, or just append London UK to be safe
      locationStr = `${postcode} London UK`;
    }
    
    const typeQuery = type ? `${type} venues` : 'child friendly venues';
    const searchQuery = `${typeQuery} near ${locationStr}`;
    
    logger.info({ searchQuery, lat, lon }, 'Brave Search fallback triggered');

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: searchQuery,
        count: Math.min(limit || 20, 20)
      },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      timeout: 10000
    });

    if (response.status === 429) {
      const retryAfter = response.headers['retry-after'];
      logger.warn({ retryAfter }, 'Brave Search rate limit exceeded');
      return null;
    }

    const results = response.data?.web?.results || [];
    logger.info({ count: results.length }, 'Brave Search fallback returned results');

    const fallbackVenues: Venue[] = results.map((result: any) => {
      const idStr = Buffer.from(result.url).toString('base64').slice(0, 12);
      const name = result.title || `Unknown ${type || 'Venue'} (Web)`;
      const description = result.description || '';
      
      const features: string[] = [];
      const nameLower = name.toLowerCase();
      const descLower = description.toLowerCase();

      if (type === 'softplay' || nameLower.includes('soft play') || descLower.includes('soft play') || nameLower.includes('play centre')) {
        features.push('soft_play');
      }
      if (nameLower.includes('party') || descLower.includes('party') || nameLower.includes('hire') || type === 'community_hall') {
        features.push('party_hire');
      }
      if (type === 'cafe' || nameLower.includes('cafe') || descLower.includes('cafe')) {
        features.push('cafe');
      }

      return {
        id: `brave-${idStr}`,
        name: name,
        type: type || 'other',
        lat: null,
        lon: null,
        source: 'brave',
        source_id: result.url,
        slug: `fallback-${idStr}`,
        sponsor_tier: null,
        sponsor_priority: null,
        description: description,
        website: result.url,
        domain: result.meta_url?.domain || new URL(result.url).hostname,
        features
      };
    });

    // Cache individual Brave results for details endpoints
    try {
      for (const venue of fallbackVenues) {
        const detailResponse: VenueDetailsResponse = {
          success: true,
          data: {
            basic: venue,
            details: {
              address: venue.description,
              website: venue.website,
              source: 'brave_search'
            }
          },
          meta: {
            is_fallback: true,
            cache_hit: false
          }
        };

        const idCacheKey = getVenueDetailsCacheKey(venue.id);
        await redis.set(idCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);

        const slugCacheKey = `venue:slug:${venue.slug}:details`;
        await redis.set(slugCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);
      }
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Error caching individual Brave results');
    }

    return fallbackVenues;
  } catch (error: any) {
    if (error.response?.status === 429) {
      logger.warn('Brave Search API rate limit exceeded (429), skipping fallback');
      return null;
    }
    logger.error({ err: error }, 'Brave Search fallback error');
    return null;
  }
};

/**
 * Fetch Yelp details using Yelp Fusion API
 * If it's a Google venue, we try to match it first.
 */
const fetchYelpDetails = async (venue: Venue) => {
  try {
    if (!env.YELP_API_KEY) {
      logger.info('Yelp details skipped: YELP_API_KEY not configured');
      return null;
    }

    let yelpId = venue.source === 'yelp' ? venue.source_id : null;

    // If it's not a Yelp source, we need to find a match
    if (!yelpId) {
      // For now, we use a simple match based on name and lat/lon if available
      // In a real scenario, we'd want address info from the DB
      if (venue.lat && venue.lon) {
        const matches = await yelpService.searchBusinesses({
          term: venue.name,
          latitude: venue.lat,
          longitude: venue.lon,
          limit: 1
        });
        if (matches && matches.length > 0) {
          yelpId = matches[0].id;
        }
      }
    }

    if (!yelpId) return null;

    const details = await yelpService.getBusinessDetails(yelpId);
    if (details) {
      return {
        name: details.name,
        address: details.location.display_address.join(', '),
        phone: details.display_phone,
        website: details.url,
        rating: details.rating,
        user_ratings_total: details.review_count,
        reviews: [], // Yelp Fusion free tier doesn't give full reviews in details, need separate endpoint
        opening_hours: details.hours?.[0] || null,
        photos: details.photos || [details.image_url]
      };
    }
    
    return null;
  } catch (error: any) {
    logger.error({ err: error, venueId: venue.id }, 'Error fetching Yelp details');
    return null;
  }
};

/**
 * Fetch OSM details
 */
const fetchOSMDetails = async (osmId: string) => {
  try {
    const response = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: {
        data: `[out:json];(node(${osmId});way(${osmId});relation(${osmId}););out;`
      },
      timeout: 10000
    });

    if (response.data && response.data.elements && response.data.elements.length > 0) {
      const element = response.data.elements[0];
      return {
        address: element.tags?.address,
        phone: element.tags?.phone,
        website: element.tags?.website,
        description: element.tags?.description
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('Error fetching OSM details:', error.message);
    return null;
  }
};

export const venueService = {
  /**
   * Search venues based on criteria
   */
  async searchVenues(query: SearchQuery): Promise<SearchResponse> {
    const { lat, lon, radius_miles = 5, type, limit = 50, borough, postcode } = query;
    const radiusMeters = radius_miles * 1609.34;

    const cacheKey = `${getSearchCacheKey(lat, lon, radius_miles, type, borough)}:${postcode || 'nopc'}`;
    // Try cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info({ cacheKey }, 'Cache hit for search');
        const parsedCache = JSON.parse(cached) as SearchResponse;
        return {
          ...parsedCache,
          meta: {
            ...parsedCache.meta,
            cache_hit: true
          }
        };
      }
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Cache read error');
    }

    let rows: Venue[] = [];
    if (borough) {
      const result = await db.query(
        `SELECT id, source, source_id, name, type, lat, lon, rating, price_level,
                NULL as distance_miles, sponsor_tier, sponsor_priority, slug
         FROM venues
         WHERE is_active = TRUE
         AND LOWER(borough) = LOWER($1)
         AND ($2::TEXT IS NULL OR type = $2::TEXT)
         ORDER BY
             CASE
                 WHEN sponsor_tier = 'gold' THEN 1
                 WHEN sponsor_tier = 'silver' THEN 2
                 WHEN sponsor_tier = 'bronze' THEN 3
                 ELSE 4
             END,
             sponsor_priority DESC NULLS LAST,
             name ASC
         LIMIT $3`,
        [borough, type, limit]
      );
      rows = result.rows;
    } else if (lat !== undefined && lon !== undefined) {
      const result = await db.query(
        'SELECT * FROM search_venues_by_radius($1, $2, $3, $4, $5)',
        [lat, lon, radiusMeters, type, limit]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT id, source, source_id, name, type, lat, lon, rating, price_level,
                NULL as distance_miles, sponsor_tier, sponsor_priority, slug
         FROM venues
         WHERE is_active = TRUE
         AND ($1::TEXT IS NULL OR type = $1::TEXT)
         ORDER BY
             CASE
                 WHEN sponsor_tier = 'gold' THEN 1
                 WHEN sponsor_tier = 'silver' THEN 2
                 WHEN sponsor_tier = 'bronze' THEN 3
                 ELSE 4
             END,
             sponsor_priority DESC NULLS LAST,
             name ASC
         LIMIT $2`,
        [type, limit]
      );
      rows = result.rows;
    }

    const sponsored = rows.filter(v => v.sponsor_tier);
    let regular = rows.filter(v => !v.sponsor_tier);

    let fallbackVenues: Venue[] | null = null;
    let fallbackSource: string | null = null;
    
    if (rows.length < (limit || 50) && !borough && lat !== undefined && lon !== undefined) {
      // 1. Try OpenStreetMap Overpass API
      const osmVenues = await fetchOsmSearchResults(lat, lon, radius_miles, type, limit);
      
      // 2. Try Brave Search API
      let braveVenues: Venue[] | null = null;
      if (process.env.BRAVE_API_KEY) {
        braveVenues = await fetchBraveSearchResults(lat, lon, radius_miles, type, limit, postcode);
      }

      fallbackVenues = [...(osmVenues || []), ...(braveVenues || [])];

      if (fallbackVenues.length > 0) {
        // Calculate distance and sort
        fallbackVenues = fallbackVenues.map(venue => {
          if (venue.lat && venue.lon) {
            venue.distance_miles = calculateDistanceMiles(lat, lon, venue.lat, venue.lon);
          }
          return venue;
        }).sort((a, b) => (a.distance_miles || Infinity) - (b.distance_miles || Infinity));
        
        // Remove duplicates by name
        const seenNames = new Set<string>();
        // Add existing database venue names to seenNames
        regular.forEach(v => seenNames.add(v.name.toLowerCase().trim()));
        
        fallbackVenues = fallbackVenues.filter(venue => {
          const name = venue.name.toLowerCase().trim();
          // basic fuzzy matching for duplicates (e.g. "Park" vs "Park (OSM 123)")
          const isDuplicate = Array.from(seenNames).some(seenName => seenName.includes(name) || name.includes(seenName));
          if (isDuplicate) return false;
          seenNames.add(name);
          return true;
        });

        if (limit && regular.length + fallbackVenues.length > limit) {
          fallbackVenues = fallbackVenues.slice(0, Math.max(0, limit - regular.length));
        }

        regular = [...regular, ...fallbackVenues];
        fallbackSource = (osmVenues && osmVenues.length > 0 && braveVenues && braveVenues.length > 0) ? 'osm+brave' : ((osmVenues && osmVenues.length > 0) ? 'osm' : 'brave_search');
      }
    }

    const response: SearchResponse = {
      success: true,
      data: {
        total: sponsored.length + regular.length,
        sponsored: {
          count: sponsored.length,
          venues: sponsored
        },
        regular: {
          count: regular.length,
          venues: regular
        },
        all: [...sponsored, ...regular]
      },
      meta: {
        search: {
          lat: lat || null,
          lon: lon || null,
          radius_miles: radius_miles,
          radius_meters: radiusMeters,
          type: type || null,
          borough: borough || null
        },
        sponsor_info: {
          gold_count: sponsored.filter(v => v.sponsor_tier === 'gold').length,
          silver_count: sponsored.filter(v => v.sponsor_tier === 'silver').length,
          bronze_count: sponsored.filter(v => v.sponsor_tier === 'bronze').length
        },
        cache_hit: false,
        fallback_source: fallbackSource,
        fallback_count: fallbackVenues?.length || 0,
        fallback_triggered: !!fallbackVenues && fallbackVenues.length > 0
      }
    };

    // Set cache
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.SEARCH);
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Cache write error');
    }

    return response;
  },

  /**
   * Get venue details by slug
   */
  async getVenueDetailsBySlug(slug: string): Promise<VenueDetailsResponse | null> {
    const cacheKey = `venue:slug:${slug}:details`;
    
    // Try cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as VenueDetailsResponse;
        return {
          ...parsed,
          meta: { ...parsed.meta, cache_hit: true }
        };
      }
    } catch (e) {
      logger.warn({ err: e }, 'Cache read error for details');
    }

    const venueResult = await db.query(
      `SELECT id, name, type, lat, lon, source, source_id, sponsor_tier, slug
       FROM venues
       WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );

    if (venueResult.rows.length === 0) return null;

    const venue = venueResult.rows[0];
    let fullDetails = null;

    if (venue.source === 'google' || venue.source === 'yelp' || venue.source === 'manual') {
      fullDetails = await fetchYelpDetails(venue);
    } else if (venue.source === 'osm') {
      fullDetails = await fetchOSMDetails(venue.source_id);
    }

    const response: VenueDetailsResponse = {
      success: true,
      data: {
        basic: venue,
        details: fullDetails
      },
      meta: { cache_hit: false }
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.VENUE_DETAILS);
    } catch (e) {
      logger.warn({ err: e }, 'Cache write error for details');
    }

    return response;
  },

  /**
   * Get venue details by ID
   */
  async getVenueDetailsById(id: string): Promise<VenueDetailsResponse | null> {
    const isBraveId = id.startsWith('brave_');
    const cacheKey = getVenueDetailsCacheKey(id);

    // Try cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as VenueDetailsResponse;
        return {
          ...parsed,
          meta: { ...parsed.meta, cache_hit: true }
        };
      }
    } catch (e) {
      logger.warn({ err: e }, 'Cache read error for details');
    }

    if (isBraveId) return null; // Brave details should be in cache if valid

    const idVal = parseInt(id);
    if (isNaN(idVal)) return null;

    const venueResult = await db.query(
      `SELECT id, name, type, lat, lon, source, source_id, sponsor_tier, slug
       FROM venues
       WHERE id = $1 AND is_active = TRUE`,
      [idVal]
    );

    if (venueResult.rows.length === 0) return null;

    const venue = venueResult.rows[0];
    let fullDetails = null;

    if (venue.source === 'google' || venue.source === 'yelp' || venue.source === 'manual') {
      fullDetails = await fetchYelpDetails(venue);
    } else if (venue.source === 'osm') {
      fullDetails = await fetchOSMDetails(venue.source_id);
    }

    const response: VenueDetailsResponse = {
      success: true,
      data: {
        basic: venue,
        details: fullDetails
      },
      meta: { cache_hit: false }
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.VENUE_DETAILS);
    } catch (e) {
      logger.warn({ err: e }, 'Cache write error for details');
    }

    return response;
  },

  /**
   * Get all venue slugs
   */
  async getAllSlugs() {
    const result = await db.query(
      `SELECT slug, last_scraped as updated_at, sponsor_tier, sponsor_priority
       FROM venues
       WHERE is_active = TRUE
       ORDER BY
           CASE
               WHEN sponsor_tier = 'gold' THEN 1
               WHEN sponsor_tier = 'silver' THEN 2
               WHEN sponsor_tier = 'bronze' THEN 3
               ELSE 4
           END,
           sponsor_priority DESC NULLS LAST,
           last_scraped DESC`
    );
    return result.rows;
  }
};
