const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

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
    
    // Set defaults
    const radiusMeters = (parseFloat(radius_miles) || 5) * 1609.34; // Default 5 miles
    const limitCount = parseInt(limit) || 50;
    const venueType = type || null;
    
    // Search venues from database (includes sponsor ranking)
    const result = await pool.query(
      'SELECT * FROM search_venues_by_radius($1, $2, $3, $4, $5)',
      [parseFloat(lat), parseFloat(lon), radiusMeters, venueType, limitCount]
    );
    
    // Separate sponsored and non-sponsored results
    const sponsored = result.rows.filter(v => v.sponsor_tier);
    const regular = result.rows.filter(v => !v.sponsor_tier);
    
    res.json({
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
          radius_miles: parseFloat(radius_miles) || 5,
          radius_meters: radiusMeters,
          type: venueType
        },
        sponsor_info: {
          gold_count: sponsored.filter(v => v.sponsor_tier === 'gold').length,
          silver_count: sponsored.filter(v => v.sponsor_tier === 'silver').length,
          bronze_count: sponsored.filter(v => v.sponsor_tier === 'bronze').length
        }
      }
    });
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
    
    res.json({
      success: true,
      data: {
        basic: venue,
        details: fullDetails
      }
    });
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
