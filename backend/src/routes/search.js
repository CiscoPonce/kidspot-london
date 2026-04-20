const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const axios = require('axios');
const Redis = require('ioredis');
require('dotenv').config();

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache TTLs
const CACHE_TTL = {
  SEARCH: 3600,      // 1 hour for search results
  VENUE_DETAILS: 3600, // 1 hour for venue details
  BRAVE_FALLBACK: 3600 // 1 hour for Brave Search fallback results
};

// Brave Search rate limit: 1 request per second
const BRAVE_SEARCH_RATE_LIMIT = 1000;
let lastBraveSearchTime = 0;

// Helper to generate cache keys
function getSearchCacheKey(lat, lon, radiusMiles, type, borough) {
  if (borough) {
    return `search:borough:${borough.toLowerCase().replace(/\s+/g, '_')}:${type || 'all'}`;
  }
  return `search:${parseFloat(lat).toFixed(4)}:${parseFloat(lon).toFixed(4)}:${radiusMiles}:${type || 'all'}`;
}

function getVenueDetailsCacheKey(id) {
  return `venue:${id}:details`;
}

// Helper to sleep for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch Brave Search results as fallback when local DB returns 0 results
async function fetchBraveSearchResults(lat, lon, radiusMiles, type, limit) {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

  // Graceful degradation: if no API key, return null
  if (!BRAVE_API_KEY) {
    console.log('Brave Search fallback skipped: BRAVE_API_KEY not configured');
    return null;
  }

  // Client-side rate limiting: wait if less than 1 second since last request
  const now = Date.now();
  const elapsed = now - lastBraveSearchTime;
  if (elapsed < BRAVE_SEARCH_RATE_LIMIT) {
    await sleep(BRAVE_SEARCH_RATE_LIMIT - elapsed);
  }
  lastBraveSearchTime = Date.now();

  // Build search query - removed hardcoded London for fallback flexibility
  const typeQuery = type ? `${type} venues` : 'venues';
  const searchQuery = `${typeQuery} near ${lat},${lon} within ${radiusMiles} miles`;

  console.log(`Brave Search fallback triggered for lat=${lat}, lon=${lon}`);

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: searchQuery,
        count: Math.min(limit || 20, 20) // Brave API max count is 20
      },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      timeout: 10000
    });

    // Handle rate limit response
    if (response.status === 429) {
      const retryAfter = response.headers['retry-after'];
      console.warn(`Brave Search rate limit exceeded${retryAfter ? `, Retry-After: ${retryAfter}s` : ''}`);
      return null;
    }

    // Parse and transform results
    const results = response.data?.web?.results || [];
    console.log(`Brave Search fallback returned ${results.length} results`);

    const fallbackVenues = results.map(result => {
      const idStr = Buffer.from(result.url).toString('base64').slice(0, 12);
      return {
        id: `brave_${idStr}`,
        name: result.title,
        type: type || 'other',
        lat: lat,
        lon: lon,
        source: 'brave',
        source_id: result.url,
        slug: `fallback-${idStr}`,
        sponsor_tier: null,
        description: result.description,
        website: result.url,
        domain: result.meta_url?.domain || new URL(result.url).hostname,
        meta_url: result.meta_url
      };
    });

    // Cache individual Brave results for the details endpoints
    try {
      for (const venue of fallbackVenues) {
        const detailResponse = {
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
            is_fallback: true
          }
        };

        // Cache by ID
        const idCacheKey = getVenueDetailsCacheKey(venue.id);
        await redis.set(idCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);

        // Cache by Slug
        const slugCacheKey = `venue:slug:${venue.slug}:details`;
        await redis.set(slugCacheKey, JSON.stringify(detailResponse), 'EX', CACHE_TTL.BRAVE_FALLBACK);
      }
    } catch (cacheError) {
      console.warn('Error caching individual Brave results:', cacheError.message);
    }

    return fallbackVenues;
  } catch (error) {
    // Graceful degradation: log error and return null without breaking search flow
    if (error.response?.status === 429) {
      console.warn('Brave Search rate limit exceeded, skipping fallback');
      return null;
    }
    console.error('Brave Search fallback error:', error.message);
    return null;
  }
}

// Get all venue slugs for sitemap
router.get('/slugs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT slug, updated_at, sponsor_tier, sponsor_priority
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
           updated_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching slugs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slugs'
    });
  }
});

// Search venues by location and radius
router.get('/venues', async (req, res) => {
  try {
    const { lat, lon, radius_miles, type, limit, borough } = req.query;

    // Validate required parameters: borough OR (lat and lon) OR type (for London-wide)
    if (!borough && (!lat || !lon) && !type) {
      return res.status(400).json({
        success: false,
        error: 'Either borough, (lat and lon), or type are required'
      });
    }

    // Validate borough if provided (optional but must be non-empty)
    if (borough && typeof borough !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'borough must be a string'
      });
    }

    // Validate lat parameter if provided
    if (lat) {
      const latVal = parseFloat(lat);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        return res.status(400).json({
          success: false,
          error: 'lat must be a number between -90 and 90'
        });
      }
    }

    // Validate lon parameter if provided
    if (lon) {
      const lonVal = parseFloat(lon);
      if (isNaN(lonVal) || lonVal < -180 || lonVal > 180) {
        return res.status(400).json({
          success: false,
          error: 'lon must be a number between -180 and 180'
        });
      }
    }

    // Validate radius_miles parameter (must be number, between 0.1 and 50)
    const radiusMilesVal = radius_miles ? parseFloat(radius_miles) : 5;
    if (isNaN(radiusMilesVal) || radiusMilesVal < 0.1 || radiusMilesVal > 50) {
      return res.status(400).json({
        success: false,
        error: 'radius_miles must be a number between 0.1 and 50'
      });
    }

    // Validate type parameter
    const validTypes = ['softplay', 'community_hall', 'leisure_centre', 'library', 'park', 'museum', 'cafe', 'other'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate limit parameter (must be number, between 1 and 100)
    const limitVal = parseInt(limit) || 50;
    if (isNaN(limitVal) || limitVal < 1 || limitVal > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a number between 1 and 100'
      });
    }

    // Set validated values
    const radiusMeters = radiusMilesVal * 1609.34;
    const limitCount = limitVal;
    const venueType = type || null;
    const radiusKey = radiusMilesVal;

    // Generate cache key
    const cacheKey = getSearchCacheKey(lat, lon, radiusKey, venueType, borough);

    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for key: ${cacheKey}`);
        const parsedCache = JSON.parse(cached);
        return res.json({
          ...parsedCache,
          meta: {
            ...parsedCache.meta,
            cache_hit: true
          }
        });
      }
    } catch (cacheError) {
      console.warn('Cache read error (continuing without cache):', cacheError.message);
    }

    // Search venues from database (includes sponsor ranking)
    let result;
    if (borough) {
      // Search by borough
      result = await pool.query(
        `SELECT id, source, source_id, name, type, lat, lon, 
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
        [borough, venueType, limitCount]
      );
    } else if (lat && lon) {
      // Search by radius
      result = await pool.query(
        'SELECT * FROM search_venues_by_radius($1, $2, $3, $4, $5)',
        [parseFloat(lat), parseFloat(lon), radiusMeters, venueType, limitCount]
      );
    } else {
      // Search London-wide by type
      result = await pool.query(
        `SELECT id, source, source_id, name, type, lat, lon, 
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
        [venueType, limitCount]
      );
    }

    // Separate sponsored and non-sponsored results
    const sponsored = result.rows.filter(v => v.sponsor_tier);
    let regular = result.rows.filter(v => !v.sponsor_tier);

    // Brave Search fallback: only trigger when local results are empty AND we're doing location search
    let fallbackVenues = null;
    console.log(`Fallback check: results=${result.rows.length}, borough=${!!borough}, hasKey=${!!process.env.BRAVE_API_KEY}`);
    if (result.rows.length === 0 && !borough && process.env.BRAVE_API_KEY) {
      console.log('Triggering Brave Search fallback...');
      fallbackVenues = await fetchBraveSearchResults(lat, lon, radiusMilesVal, venueType, limitCount);
      if (fallbackVenues && fallbackVenues.length > 0) {
        regular = fallbackVenues;
      }
    }

    const response = {
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
          lat: lat ? parseFloat(lat) : null,
          lon: lon ? parseFloat(lon) : null,
          radius_miles: radiusKey,
          radius_meters: radiusMeters,
          type: venueType,
          borough: borough || null
        },
        sponsor_info: {
          gold_count: sponsored.filter(v => v.sponsor_tier === 'gold').length,
          silver_count: sponsored.filter(v => v.sponsor_tier === 'silver').length,
          bronze_count: sponsored.filter(v => v.sponsor_tier === 'bronze').length
        },
        cache_hit: false,
        fallback_source: fallbackVenues ? 'brave_search' : null,
        fallback_count: fallbackVenues?.length || 0,
        fallback_triggered: !!fallbackVenues
      }
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.SEARCH);
      console.log(`Cached search results with key: ${cacheKey}`);
    } catch (cacheError) {
      console.warn('Cache write error (continuing without cache):', cacheError.message);
    }

    res.json(response);
  } catch (error) {
    console.error('Error searching venues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search venues'
    });
  }
});

// Get venue details (agentic search - fetches full details on demand)
router.get('/venues/slug/:slug/details', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'slug is required'
      });
    }

    // Generate cache key
    const cacheKey = `venue:slug:${slug}:details`;

    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for venue details by slug: ${cacheKey}`);
        const parsedCache = JSON.parse(cached);
        return res.json({
          ...parsedCache,
          meta: {
            ...(parsedCache.meta || {}),
            cache_hit: true
          }
        });
      }
    } catch (cacheError) {
      console.warn('Cache read error (continuing without cache):', cacheError.message);
    }

    // Get basic venue info from database
    const venueResult = await pool.query(
      `SELECT id, name, type, lat, lon, source, source_id, sponsor_tier, slug
       FROM venues
       WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    const venue = venueResult.rows[0];

    // Fetch full details from source (agentic search)
    let fullDetails = null;

    if (venue.source === 'google' && venue.source_id) {
      fullDetails = await fetchGooglePlaceDetails(venue.source_id);
    } else if (venue.source === 'osm') {
      fullDetails = await fetchOSMDetails(venue.source_id);
    }

    const response = {
      success: true,
      data: {
        basic: venue,
        details: fullDetails
      },
      meta: {
        cache_hit: false
      }
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.VENUE_DETAILS);
      console.log(`Cached venue details for slug with key: ${cacheKey}`);
    } catch (cacheError) {
      console.warn('Cache write error (continuing without cache):', cacheError.message);
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching venue details by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue details'
    });
  }
});

// Get venue details (agentic search - fetches full details on demand)
router.get('/venues/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id parameter (must be positive integer OR start with brave_)
    const isBraveId = typeof id === 'string' && id.startsWith('brave_');
    const idVal = parseInt(id);
    
    if (!isBraveId && (isNaN(idVal) || idVal < 1)) {
      return res.status(400).json({
        success: false,
        error: 'id must be a positive integer or a valid fallback ID'
      });
    }

    // Generate cache key
    const cacheKey = getVenueDetailsCacheKey(id);

    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for venue details: ${cacheKey}`);
        const parsedCache = JSON.parse(cached);
        return res.json({
          ...parsedCache,
          meta: {
            ...(parsedCache.meta || {}),
            cache_hit: true
          }
        });
      }
    } catch (cacheError) {
      console.warn('Cache read error (continuing without cache):', cacheError.message);
    }

    // Get basic venue info from database (only if it's a numeric ID)
    let venueResult;
    if (!isBraveId) {
      venueResult = await pool.query(
        `SELECT id, name, type, lat, lon, source, source_id, sponsor_tier, slug
         FROM venues
         WHERE id = $1 AND is_active = TRUE`,
        [id]
      );
    }

    if (!venueResult || venueResult.rows.length === 0) {
      // If it's a Brave ID and not in cache, it's truly not found or expired
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    const venue = venueResult.rows[0];

    // Fetch full details from source (agentic search)
    let fullDetails = null;

    if (venue.source === 'google' && venue.source_id) {
      fullDetails = await fetchGooglePlaceDetails(venue.source_id);
    } else if (venue.source === 'osm') {
      fullDetails = await fetchOSMDetails(venue.source_id);
    }

    const response = {
      success: true,
      data: {
        basic: venue,
        details: fullDetails
      },
      meta: {
        cache_hit: false
      }
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.VENUE_DETAILS);
      console.log(`Cached venue details with key: ${cacheKey}`);
    } catch (cacheError) {
      console.warn('Cache write error (continuing without cache):', cacheError.message);
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching venue details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue details'
    });
  }
});

// Fetch Google Place details
async function fetchGooglePlaceDetails(placeId) {
  try {
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!GOOGLE_PLACES_API_KEY) {
      return null;
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,rating,review_types,reviews,opening_hours,photos',
        key: GOOGLE_PLACES_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.result) {
      return {
        address: response.data.result.formatted_address,
        phone: response.data.result.formatted_phone_number,
        website: response.data.result.website,
        rating: response.data.result.rating,
        reviews: response.data.result.reviews,
        opening_hours: response.data.result.opening_hours,
        photos: response.data.result.photos
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Google Place details:', error.message);
    return null;
  }
}

// Fetch OSM details
async function fetchOSMDetails(osmId) {
  try {
    const response = await axios.get(`https://overpass-api.de/api/interpreter`, {
      params: {
        data: `[out:json];(node(${osmId});way(${osmId});relation(${osmId}););out;`
      },
      timeout: 10000
    });

    if (response.data && response.data.elements && response.data.elements.length > 0) {      const element = response.data.elements[0];
      return {
        address: element.tags?.address,
        phone: element.tags?.phone,
        website: element.tags?.website,
        description: element.tags?.description
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching OSM details:', error.message);
    return null;
  }
}

module.exports = router;
