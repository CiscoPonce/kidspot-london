import axios from 'axios';
import { db } from '../clients/db.js';
import { redis } from '../clients/redis.js';
import { braveSearchLimiter } from '../middleware/rateLimit.js';
import { logger } from '../config/logger.js';
import { 
  Venue, 
  SearchQuery, 
  SearchResponse, 
  VenueDetailsResponse, 
  VenueProvenanceLog, 
  ProvenanceChange,
  VenueFacet,
  FacetSearchQuery,
  FacetSearchResponse,
  FhrsEstablishment,
  BoroughCsvSource,
  BoroughCsvRecord,
  ParsedCsvRecord
} from '../types/venue.js';
import { yelpService } from './yelpService.js';
import { fhrsService } from './fhrsService.js';
import { boroughCsvService } from './boroughCsvService.js';
import env from '../config/env.js';
import { calculateDistanceMiles } from '../utils/distance.js';

/**
 * Log a change to a venue field for provenance tracking
 */
export async function logProvenance(change: ProvenanceChange): Promise<void> {
  try {
    await db.query(
      'SELECT log_venue_change($1, $2, $3, $4, $5, $6, $7)',
      [
        change.venue_id,
        change.field_name,
        change.old_value,
        change.new_value,
        change.source,
        change.changed_by,
        change.reason || null
      ]
    );
  } catch (error) {
    logger.error({ err: error, change }, 'Error logging venue provenance');
  }
}

/**
 * Check if a venue is locked for manual/editor changes
 */
export async function checkEditorLocked(venueId: number): Promise<boolean> {
  try {
    const result = await db.query('SELECT editor_locked FROM venues WHERE id = $1', [venueId]);
    return result.rows[0]?.editor_locked || false;
  } catch (error) {
    logger.error({ err: error, venueId }, 'Error checking editor_locked status');
    return false;
  }
}

/**
 * Get provenance history for a venue
 */
export async function getVenueProvenance(venueId: number, limit: number = 50): Promise<VenueProvenanceLog[]> {
  try {
    const result = await db.query(
      'SELECT * FROM venue_provenance_log WHERE venue_id = $1 ORDER BY created_at DESC LIMIT $2',
      [venueId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error({ err: error, venueId }, 'Error fetching venue provenance history');
    return [];
  }
}

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

    // Build a list of clause groups. Each group is a tag selector applied to
    // node/way/relation. Multiple groups are unioned in a single Overpass
    // query.
    let clauses: string[] = [];

    if (type === 'softplay') {
      // 1) Dedicated indoor play centres
      clauses.push('["leisure"="indoor_play"]');
      // 2) Council-run leisure centres / sports halls that host soft play
      //    sessions (e.g. Atherton Leisure Centre, Mile End Park Leisure
      //    Centre). Matched by name pattern to exclude adult-only chains
      //    like PureGym / CorePower / Anytime Fitness.
      clauses.push('["leisure"~"fitness_centre|sports_centre"]["name"~"leisure centre|sports centre|kids|family|play",i]');
    } else if (type === 'community_hall') {
      clauses.push('["amenity"="community_centre"]');
    } else if (type === 'leisure_centre') {
      clauses.push('["leisure"~"sports_centre|fitness_centre"]');
    } else if (type === 'park') {
      clauses.push('["leisure"="park"]');
    } else if (type === 'library') {
      clauses.push('["amenity"="library"]');
    } else if (type === 'museum') {
      clauses.push('["tourism"="museum"]');
    } else if (type === 'cafe') {
      clauses.push('["amenity"="cafe"]');
    } else {
      clauses.push('["leisure"~"indoor_play|park|playground|sports_centre"]');
    }

    const buildClauseBlock = (sel: string) =>
      `node${sel}(around:${radiusMeters},${lat},${lon});` +
      `way${sel}(around:${radiusMeters},${lat},${lon});` +
      `relation${sel}(around:${radiusMeters},${lat},${lon});`;

    const query = `
      [out:json][timeout:10];
      (
        ${clauses.map(buildClauseBlock).join('\n        ')}
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

        // Council-run leisure centres operated by Better/GLL or Everyone Active
        // commonly host soft play sessions, party hire and a cafe. Mark those
        // features so the listing aligns with what users will actually find on
        // arrival, both when the search type is `leisure_centre` and when it's
        // the user-facing `softplay` filter.
        const isKnownKidFriendlyLeisureCentre =
          (nameLower.includes('atherton') ||
            nameLower.includes('better') ||
            nameLower.includes('everyone active') ||
            nameLower.includes('leisure centre')) &&
          (tags.leisure === 'fitness_centre' ||
            tags.leisure === 'sports_centre' ||
            type === 'leisure_centre' ||
            type === 'softplay');
        if (isKnownKidFriendlyLeisureCentre) {
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

    // Drop obvious SEO listicles, "best of" guides, year-stamped roundups, and
    // aggregator/directory pages. These are not real venues and historically
    // polluted the search results (e.g. "London Soft Play 2026 | UK's #1 Soft
    // Play Finder", "Top 10 Soft Play Areas In London - Nannytax").
    const LISTICLE_TITLE_RE = /(\b(20\d{2})\b|\btop\s*\d+\b|\bbest\s+(of|\d+)\b|\b\d+\s+of\b|\b#\s*1\b|\bguide\b|\bfinder\b|\bdirectory\b|\bblog\b|\broundup\b|\bnear me\b|\|.*\|)/i;
    const LISTICLE_DOMAIN_RE = /(timeout\.|nannytax\.|mumsnet\.|tripadvisor\.|reddit\.|quora\.|pinterest\.|facebook\.|wikipedia\.|youtube\.|instagram\.|tiktok\.|medium\.|wordpress\.|substack\.|theguardian\.|telegraph\.|standard\.co\.uk|expedia\.|booking\.com)/i;
    const isLikelyRealVenue = (result: any): boolean => {
      const t = (result.title || '').trim();
      if (!t) return false;
      // Multi-clause SEO titles are nearly always listicles
      if ((t.match(/\|/g) || []).length >= 1) return false;
      if (t.length > 80) return false;
      if (LISTICLE_TITLE_RE.test(t)) return false;
      const domain = result.meta_url?.domain || (() => {
        try { return new URL(result.url).hostname; } catch { return ''; }
      })();
      if (LISTICLE_DOMAIN_RE.test(domain)) return false;
      return true;
    };

    const filteredResults = results.filter(isLikelyRealVenue);
    if (filteredResults.length < results.length) {
      logger.info(
        { dropped: results.length - filteredResults.length, kept: filteredResults.length },
        'Brave fallback: dropped likely-listicle results'
      );
    }

    const fallbackVenues: Venue[] = filteredResults.map((result: any) => {
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

    const [details, reviews] = await Promise.all([
      yelpService.getBusinessDetails(yelpId),
      yelpService.getBusinessReviews(yelpId)
    ]);

    if (details) {
      return {
        name: details.name,
        address: details.location.display_address.join(', '),
        phone: details.display_phone,
        website: details.url,
        rating: details.rating,
        user_ratings_total: details.review_count,
        reviews: reviews || [],
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
                NULL as distance_miles, sponsor_tier, sponsor_priority, slug, parent_facets
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
                NULL as distance_miles, sponsor_tier, sponsor_priority, slug, parent_facets
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
      // Step 1: try OSM Overpass first — it returns real geocoded venues.
      const osmVenues = await fetchOsmSearchResults(lat, lon, radius_miles, type);

      // Step 2: only fall back to Brave Search when neither the local DB nor
      // OSM returned a single real venue. Brave returns web search snippets,
      // which are useful as a last-resort hint but NOT as padding for healthy
      // result sets (it produces SEO listicle / aggregator titles).
      const localPlusOsm = rows.length + (osmVenues?.length || 0);
      const braveVenues = (localPlusOsm === 0 && process.env.BRAVE_API_KEY)
        ? await fetchBraveSearchResults(lat, lon, radius_miles, type, limit, postcode)
        : null;

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
        const usedOsm = osmVenues && osmVenues.length > 0;
        const usedBrave = braveVenues && braveVenues.length > 0;
        fallbackSource = (usedOsm && usedBrave) ? 'osm+brave' : (usedOsm ? 'osm' : 'brave_search');
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
  },

  /**
   * Track an outbound click
   */
  async trackClick(venueId: string, clickType: string, ip: string, userAgent: string) {
    try {
      const isFallback = venueId.startsWith('osm_') || venueId.startsWith('brave-') || venueId.startsWith('brave_');
      
      // Simple anonymization of IP (e.g. hash it)
      const ipHash = Buffer.from(ip).toString('base64').slice(0, 16);

      if (isFallback) {
        await db.query(
          `INSERT INTO outbound_clicks (fallback_id, click_type, user_ip_hash, user_agent)
           VALUES ($1, $2, $3, $4)`,
          [venueId, clickType, ipHash, userAgent]
        );
      } else {
        const idVal = parseInt(venueId);
        if (!isNaN(idVal)) {
          await db.query(
            `INSERT INTO outbound_clicks (venue_id, click_type, user_ip_hash, user_agent)
             VALUES ($1, $2, $3, $4)`,
            [idVal, clickType, ipHash, userAgent]
          );
        }
      }
      return true;
    } catch (error) {
      logger.error({ err: error, venueId, clickType }, 'Error tracking outbound click');
      return false;
    }
  },

  /**
   * Track a venue impression (page view)
   */
  async trackImpression(venueId: string, ip: string, userAgent: string, referrer?: string) {
    try {
      const isFallback = venueId.startsWith('osm_') || venueId.startsWith('brave-') || venueId.startsWith('brave_');
      
      const ipHash = Buffer.from(ip).toString('base64').slice(0, 16);

      if (isFallback) {
        await db.query(
          `INSERT INTO venue_views (fallback_id, user_ip_hash, user_agent, referrer)
           VALUES ($1, $2, $3, $4)`,
          [venueId, ipHash, userAgent, referrer]
        );
      } else {
        const idVal = parseInt(venueId);
        if (!isNaN(idVal)) {
          await db.query(
            `INSERT INTO venue_views (venue_id, user_ip_hash, user_agent, referrer)
             VALUES ($1, $2, $3, $4)`,
            [idVal, ipHash, userAgent, referrer]
          );
        }
      }
      return true;
    } catch (error) {
      logger.error({ err: error, venueId }, 'Error tracking venue impression');
      return false;
    }
  },

  /**
   * Geocode a borough name to approximate lat/lon
   */
  async geocodeBorough(borough: string): Promise<{ lat: number; lon: number } | null> {
    const boroughs: Record<string, { lat: number; lon: number }> = {
      'newham': { lat: 51.53, lon: 0.04 },
      'tower hamlets': { lat: 51.51, lon: -0.01 },
      'hackney': { lat: 51.54, lon: -0.06 },
      'greenwich': { lat: 51.48, lon: 0.01 },
      'islington': { lat: 51.54, lon: -0.10 },
      'camden': { lat: 51.54, lon: -0.14 },
      'southwark': { lat: 51.48, lon: -0.08 },
      'lambeth': { lat: 51.46, lon: -0.11 },
      'wandsworth': { lat: 51.45, lon: -0.19 },
      'lewisham': { lat: 51.44, lon: -0.02 },
    };
    return boroughs[borough.toLowerCase()] || null;
  },

  /**
   * Geocode a postcode to approximate lat/lon (Mock/Minimal for London)
   */
  async geocodePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
    const pc = postcode.toUpperCase().replace(/\s+/g, '');
    if (pc.startsWith('E15')) return { lat: 51.54, lon: 0.00 };
    if (pc.startsWith('EC1')) return { lat: 51.52, lon: -0.09 };
    if (pc.startsWith('N1')) return { lat: 51.53, lon: -0.10 };
    if (pc.startsWith('SE1')) return { lat: 51.50, lon: -0.08 };
    if (pc.startsWith('SW1')) return { lat: 51.49, lon: -0.14 };
    if (pc.startsWith('W1')) return { lat: 51.51, lon: -0.14 };
    return null;
  },

  /**
   * Search venues by facets with proximity support
   */
  async searchVenuesByFacets(query: FacetSearchQuery): Promise<FacetSearchResponse> {
    const { lat, lon, radius_miles = 5, facets = [], limit = 50, borough, postcode } = query;
    let searchLat = lat;
    let searchLon = lon;

    // Resolve lat/lon from borough/postcode if missing
    if (searchLat === undefined || searchLon === undefined) {
      if (postcode) {
        const geo = await this.geocodePostcode(postcode);
        if (geo) {
          searchLat = geo.lat;
          searchLon = geo.lon;
        }
      } else if (borough) {
        const geo = await this.geocodeBorough(borough);
        if (geo) {
          searchLat = geo.lat;
          searchLon = geo.lon;
        }
      }
    }

    const radiusMeters = radius_miles * 1609.34;
    const cacheKey = `search:facets:${facets.sort().join(',')}:${searchLat?.toFixed(4)}:${searchLon?.toFixed(4)}:${radius_miles}:${borough || 'noboro'}:${postcode || 'nopc'}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached) as FacetSearchResponse;
        return {
          ...parsedCache,
          meta: { ...parsedCache.meta, cache_hit: true }
        };
      }
    } catch (e) {
      logger.warn({ err: e }, 'Cache read error for facet search');
    }

    let rows: Venue[] = [];

    if (searchLat !== undefined && searchLon !== undefined) {
      const result = await db.query(
        'SELECT * FROM search_venues_by_facets($1, $2, $3, $4, $5)',
        [searchLat, searchLon, radiusMeters, facets.length > 0 ? facets : null, limit]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT id, source, source_id, name, type, lat, lon, rating, price_level,
                NULL as distance_miles, sponsor_tier, sponsor_priority, slug, parent_facets
         FROM venues
         WHERE is_active = TRUE
         AND ($1::TEXT[] IS NULL OR parent_facets && $1::TEXT[])
         AND ($2::TEXT IS NULL OR LOWER(borough) = LOWER($2))
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
        [facets.length > 0 ? facets : null, borough || null, limit]
      );
      rows = result.rows;
    }

    const sponsored = rows.filter(v => v.sponsor_tier);
    const regular = rows.filter(v => !v.sponsor_tier);

    const response: FacetSearchResponse = {
      success: true,
      data: {
        total: rows.length,
        sponsored: { count: sponsored.length, venues: sponsored },
        regular: { count: regular.length, venues: regular },
        all: rows
      },
      meta: {
        search: {
          lat: searchLat || null,
          lon: searchLon || null,
          radius_miles: radius_miles,
          radius_meters: radiusMeters,
          type: null,
          facets: facets,
          borough: borough || null
        },
        sponsor_info: {
          gold_count: sponsored.filter(v => v.sponsor_tier === 'gold').length,
          silver_count: sponsored.filter(v => v.sponsor_tier === 'silver').length,
          bronze_count: sponsored.filter(v => v.sponsor_tier === 'bronze').length
        },
        cache_hit: false
      }
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.SEARCH);
    } catch (e) {
      logger.warn({ err: e }, 'Cache write error for facet search');
    }

    return response;
  },

  /**
   * Get facets for a venue
   */
  async getVenueFacets(venueId: number): Promise<VenueFacet[]> {
    try {
      const result = await db.query(
        'SELECT parent_facets FROM venues WHERE id = $1',
        [venueId]
      );
      return result.rows[0]?.parent_facets || [];
    } catch (error) {
      logger.error({ err: error, venueId }, 'Error fetching venue facets');
      return [];
    }
  },

  /**
   * Update facets for a venue (respects guardrails)
   */
  async updateVenueFacets(venueId: number, facets: VenueFacet[], changedBy: string): Promise<boolean> {
    try {
      const isLocked = await checkEditorLocked(venueId);
      if (isLocked && changedBy !== 'system_admin') {
        logger.warn({ venueId, changedBy }, 'Attempted to update facets on locked venue');
        return false;
      }

      const oldFacetsResult = await db.query('SELECT parent_facets FROM venues WHERE id = $1', [venueId]);
      const oldFacets = oldFacetsResult.rows[0]?.parent_facets || [];

      await db.query(
        'UPDATE venues SET parent_facets = $1, updated_at = NOW() WHERE id = $2',
        [facets, venueId]
      );

      await logProvenance({
        venue_id: venueId,
        field_name: 'parent_facets',
        old_value: JSON.stringify(oldFacets),
        new_value: JSON.stringify(facets),
        source: 'manual_update',
        changed_by: changedBy,
        reason: 'Updated facets via admin/editor'
      });

      return true;
    } catch (error) {
      logger.error({ err: error, venueId }, 'Error updating venue facets');
      return false;
    }
  },

  logProvenance,
  checkEditorLocked,
  getVenueProvenance,

  /**
   * Get basic venue info by ID
   */
  async getVenueById(id: number): Promise<Venue | null> {
    try {
      const result = await db.query(
        'SELECT * FROM venues WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, id }, 'Error fetching venue by ID');
      return null;
    }
  },

  /**
   * Match a venue to FHRS establishment and store it
   */
  async matchVenueToFhrs(venueId: number): Promise<FhrsEstablishment | null> {
    const venue = await this.getVenueById(venueId);
    if (!venue) return null;

    // Use name and address/postcode if available for matching
    const match = await fhrsService.matchFhrsToVenue({
      name: venue.name,
      postcode: venue.address?.match(/[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}/)?.[0],
      latitude: venue.lat || undefined,
      longitude: venue.lon || undefined,
    });

    if (match) {
      await this.storeFhrsEstablishment(match);
      
      // Update venue with FHRS ID
      await db.query(
        'UPDATE venues SET fhrs_establishment_id = $1 WHERE id = $2',
        [match.id, venueId]
      );
      
      return match;
    }

    return null;
  },

  /**
   * Store FHRS establishment details in database
   */
  async storeFhrsEstablishment(est: FhrsEstablishment): Promise<void> {
    try {
      await db.query(
        `INSERT INTO fhrs_establishments (
          id, business_name, business_type, business_type_id,
          address_line1, address_line2, address_line3, address_line4,
          postcode, rating_value, rating_key, rating_date,
          local_authority_name, lat, lon,
          scores_hygiene, scores_structural, scores_confidence_in_management,
          last_updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) ON CONFLICT (id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          business_type = EXCLUDED.business_type,
          business_type_id = EXCLUDED.business_type_id,
          address_line1 = EXCLUDED.address_line1,
          address_line2 = EXCLUDED.address_line2,
          address_line3 = EXCLUDED.address_line3,
          address_line4 = EXCLUDED.address_line4,
          postcode = EXCLUDED.postcode,
          rating_value = EXCLUDED.rating_value,
          rating_key = EXCLUDED.rating_key,
          rating_date = EXCLUDED.rating_date,
          local_authority_name = EXCLUDED.local_authority_name,
          lat = EXCLUDED.lat,
          lon = EXCLUDED.lon,
          scores_hygiene = EXCLUDED.scores_hygiene,
          scores_structural = EXCLUDED.scores_structural,
          scores_confidence_in_management = EXCLUDED.scores_confidence_in_management,
          last_updated = EXCLUDED.last_updated`,
        [
          est.id, est.business_name, est.business_type, est.business_type_id,
          est.address_line1, est.address_line2, est.address_line3, est.address_line4,
          est.postcode, est.rating_value, est.rating_key, est.rating_date,
          est.local_authority_name, est.lat, est.lon,
          est.scores_hygiene, est.scores_structural, est.scores_confidence_in_management,
          est.last_updated
        ]
      );
    } catch (error) {
      logger.error({ err: error, fhrsId: est.id }, 'Error storing FHRS establishment');
    }
  },

  /**
   * Update venue details from FHRS data (respects guardrails)
   */
  async updateVenueFromFhrs(venueId: number, fhrsId: number): Promise<boolean> {
    try {
      const isLocked = await checkEditorLocked(venueId);
      if (isLocked) {
        logger.info({ venueId }, 'Skipping FHRS update for locked venue');
        return false;
      }

      const est = await fhrsService.getEstablishment(fhrsId);
      if (!est) return false;

      // Update FHRS data in our DB first
      await this.storeFhrsEstablishment(est);

      // Only update address/postcode if they are missing or likely better
      const venue = await this.getVenueById(venueId);
      if (!venue) return false;

      const updates: Record<string, any> = {};
      const provenanceLogs: any[] = [];

      // Combine FHRS address lines
      const fhrsAddress = [est.address_line1, est.address_line2, est.address_line3, est.address_line4]
        .filter(Boolean)
        .join(', ');

      if (fhrsAddress && (!venue.address || venue.address.length < 10)) {
        updates.address = fhrsAddress;
        provenanceLogs.push({ field: 'address', old: venue.address, new: fhrsAddress });
      }

      // Update trust score boost if relevant
      const relevanceResult = await db.query(
          'SELECT trust_boost_multiplier FROM fhrs_business_type_allowlist WHERE business_type = $1 AND is_party_relevant = TRUE',
          [est.business_type]
      );
      
      if (relevanceResult.rows.length > 0) {
          const multiplier = parseFloat(relevanceResult.rows[0].trust_boost_multiplier);
          if (venue.kid_score) {
              const newScore = Math.min(10, Math.round(venue.kid_score * multiplier * 10) / 10);
              if (newScore !== venue.kid_score) {
                updates.kid_score = newScore;
                provenanceLogs.push({ field: 'kid_score', old: venue.kid_score, new: newScore });
              }
          }
      }

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
        const values = Object.values(updates);
        values.push(venueId);

        await db.query(
          `UPDATE venues SET ${setClause}, updated_at = NOW() WHERE id = $${values.length}`,
          values
        );

        for (const log of provenanceLogs) {
          await logProvenance({
            venue_id: venueId,
            field_name: log.field,
            old_value: String(log.old),
            new_value: String(log.new),
            source: 'fhrs_enrichment',
            changed_by: 'system',
            reason: 'Enriched from FHRS'
          });
        }
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ err: error, venueId, fhrsId }, 'Error updating venue from FHRS');
      return false;
    }
  },

  /**
   * Batch match venues to FHRS establishments
   */
  async batchMatchVenuesToFhrs(limit: number = 100): Promise<{ matched: number; total: number }> {
    try {
      const result = await db.query(
        `SELECT id FROM venues 
         WHERE fhrs_establishment_id IS NULL 
         AND editor_locked = FALSE 
         LIMIT $1`,
        [limit]
      );

      let matchedCount = 0;
      for (const row of result.rows) {
        const match = await this.matchVenueToFhrs(row.id);
        if (match) {
          matchedCount++;
          await this.updateVenueFromFhrs(row.id, match.id);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return { matched: matchedCount, total: result.rows.length };
    } catch (error) {
      logger.error({ err: error }, 'Error in batch FHRS matching');
      return { matched: 0, total: 0 };
    }
  }
};
