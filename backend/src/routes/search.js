const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
const Redis = require('ioredis');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache TTLs
const CACHE_TTL = {
  SEARCH: 3600,      // 1 hour for search results
  VENUE_DETAILS: 3600 // 1 hour for venue details
};

// Helper to generate cache keys
function getSearchCacheKey(lat, lon, radiusMiles, type) {
  return `search:${parseFloat(lat).toFixed(4)}:${parseFloat(lon).toFixed(4)}:${radiusMiles}:${type || 'all'}`;
}

function getVenueDetailsCacheKey(id) {
  return `venue:${id}:details`;
}

// Search venues by location and radius
router.get('/venues', async (req, res) => {
  try {
    const { lat, lon, radius_miles, type, limit } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'lat and lon are required'
      });
    }

    // Validate lat parameter (must be number, between -90 and 90)
    const latVal = parseFloat(lat);
    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      return res.status(400).json({
        success: false,
        error: 'lat must be a number between -90 and 90'
      });
    }

    // Validate lon parameter (must be number, between -180 and 180)
    const lonVal = parseFloat(lon);
    if (isNaN(lonVal) || lonVal < -180 || lonVal > 180) {
      return res.status(400).json({
        success: false,
        error: 'lon must be a number between -180 and 180'
      });
    }

    // Validate radius_miles parameter (must be number, between 0.1 and 50)
    const radiusMilesVal = radius_miles ? parseFloat(radius_miles) : 5;
    if (isNaN(radiusMilesVal) || radiusMilesVal < 0.1 || radiusMilesVal > 50) {
      return res.status(400).json({
        success: false,
        error: 'radius_miles must be a number between 0.1 and 50'
      });
    }

    // Validate type parameter (must be one of: softplay, community_hall, park, other)
    const validTypes = ['softplay', 'community_hall', 'park', 'other'];
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
    const cacheKey = getSearchCacheKey(lat, lon, radiusKey, venueType);

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
    const result = await pool.query(
      'SELECT * FROM search_venues_by_radius($1, $2, $3, $4, $5)',
      [parseFloat(lat), parseFloat(lon), radiusMeters, venueType, limitCount]
    );

    // Separate sponsored and non-sponsored results
    const sponsored = result.rows.filter(v => v.sponsor_tier);
    const regular = result.rows.filter(v => !v.sponsor_tier);

    const response = {
      success: true,
      data: {
        total: result.rows.length,
        sponsored: {
          count: sponsored.length,
          venues: sponsored
        },
        regular: {
          count: regular.length,
          venues: regular
        },
        all: result.rows
      },
      meta: {
        search: {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          radius_miles: radiusKey,
          radius_meters: radiusMeters,
          type: venueType
        },
        sponsor_info: {
          gold_count: sponsored.filter(v => v.sponsor_tier === 'gold').length,
          silver_count: sponsored.filter(v => v.sponsor_tier === 'silver').length,
          bronze_count: sponsored.filter(v => v.sponsor_tier === 'bronze').length
        },
        cache_hit: false
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
router.get('/venues/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id parameter (must be positive integer)
    const idVal = parseInt(id);
    if (isNaN(idVal) || idVal < 1) {
      return res.status(400).json({
        success: false,
        error: 'id must be a positive integer'
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

    // Get basic venue info from database
    const venueResult = await pool.query(
      `SELECT id, name, type, lat, lon, source, source_id, sponsor_tier
       FROM venues
       WHERE id = $1 AND is_active = TRUE`,
      [id]
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
        data: `[out:json];node(${osmId});out;`
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
  } catch (error) {
    console.error('Error fetching OSM details:', error.message);
    return null;
  }
}

module.exports = router;
