import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

export interface OpenActiveFeed {
  id: number;
  publisher_name: string;
  feed_url: string;
  feed_type: string;
  licence_name: string | null;
  licence_url: string | null;
  refresh_cadence: string;
  last_fetched_at: Date | null;
  last_imported_at: Date | null;
  session_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpenActiveLocation {
  id: number;
  openactive_feed_id: number;
  external_id: string;
  name: string;
  description: string | null;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  venue_id: number | null;
  raw_data: any;
  imported_at: Date;
}

export interface OpenActiveSession {
  id: number;
  openactive_location_id: number;
  external_id: string;
  name: string;
  description: string | null;
  activity_type: string | null;
  age_range: string | null;
  start_date: Date | null;
  end_date: Date | null;
  schedule: string | null;
  price: string | null;
  booking_url: string | null;
  availability_status: string | null;
  raw_data: any;
  imported_at: Date;
}

export const openactiveService = {
  /**
   * Get all active OpenActive feeds
   */
  async getActiveFeeds(): Promise<OpenActiveFeed[]> {
    const result = await db.query(
      'SELECT * FROM openactive_feeds WHERE is_active = TRUE ORDER BY publisher_name'
    );
    return result.rows;
  },

  /**
   * Get OpenActive feed by ID
   */
  async getFeed(id: number): Promise<OpenActiveFeed | null> {
    const result = await db.query(
      'SELECT * FROM openactive_feeds WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Fetch OpenActive feed data
   */
  async fetchFeedData(feedUrl: string): Promise<any> {
    const response = await fetch(feedUrl, {
      headers: {
        'Accept': 'application/ld+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenActive feed: ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Parse OpenActive feed data
   */
  parseFeedData(feedData: any): {
    locations: any[];
    sessions: any[];
  } {
    const locations: any[] = [];
    const sessions: any[] = [];

    // OpenActive feeds use JSON-LD format
    // Real-world RPDE feeds are paged; this is a simplified pilot ingest
    const data = Array.isArray(feedData) ? feedData : (feedData.data || feedData.items || []);

    for (const item of data) {
      // Handle RPDE items or direct JSON-LD
      const body = item.data || item;
      const type = body['@type'] || body.type;

      if (type === 'Place' || type === 'Location') {
        locations.push(body);
      } else if (type === 'ScheduledSession' || type === 'SessionSeries') {
        sessions.push(body);
      }
    }

    return { locations, sessions };
  },

  /**
   * Ingest OpenActive feed
   */
  async ingestFeed(feedId: number): Promise<{
    locations_imported: number;
    sessions_imported: number;
    failed: number;
  }> {
    const metrics = { locations_imported: 0, sessions_imported: 0, failed: 0 };

    // Get feed details
    const feed = await this.getFeed(feedId);
    if (!feed) {
      throw new Error('OpenActive feed not found');
    }

    try {
      // Fetch feed data
      const feedData = await this.fetchFeedData(feed.feed_url);

      // Parse feed data
      const { locations, sessions } = this.parseFeedData(feedData);

      // Import locations
      for (const location of locations) {
        try {
          await this.importLocation(feedId, location);
          metrics.locations_imported++;
        } catch (error) {
          logger.error({ err: error, location }, 'Failed to import OpenActive location');
          metrics.failed++;
        }
      }

      // Import sessions
      for (const session of sessions) {
        try {
          await this.importSession(session);
          metrics.sessions_imported++;
        } catch (error) {
          logger.error({ err: error, session }, 'Failed to import OpenActive session');
          metrics.failed++;
        }
      }

      // Update feed stats
      await db.query('SELECT update_openactive_feed_stats($1, $2)', [feedId, metrics.sessions_imported]);

      // Update feed last_fetched_at
      await db.query(
        'UPDATE openactive_feeds SET last_fetched_at = NOW() WHERE id = $1',
        [feedId]
      );

      logger.info({ feedId, metrics }, 'OpenActive feed ingestion complete');

      return metrics;
    } catch (error) {
      logger.error({ err: error, feedId }, 'Failed to ingest OpenActive feed');
      throw error;
    }
  },

  /**
   * Import OpenActive location
   */
  async importLocation(feedId: number, locationData: any): Promise<void> {
    const externalId = locationData['@id'] || locationData.id;
    if (!externalId) {
      throw new Error('Missing external_id for location');
    }
    
    const name = locationData.name || locationData.title;
    if (!name) {
      throw new Error('Missing name for location');
    }

    // Extract geo data
    const geo = locationData.geo || locationData.location?.geo;
    const lat = geo?.latitude || geo?.lat;
    const lon = geo?.longitude || geo?.lon;

    // Extract address
    const addressData = locationData.address;
    let address = typeof addressData === 'string' ? addressData : addressData?.streetAddress;
    let postcode = typeof addressData === 'string' ? null : addressData?.postalCode;

    // Insert or update location
    await db.query(
      `INSERT INTO openactive_locations (
        openactive_feed_id, external_id, name, description, address, postcode, lat, lon, url, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (openactive_feed_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        address = EXCLUDED.address,
        postcode = EXCLUDED.postcode,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        url = EXCLUDED.url,
        raw_data = EXCLUDED.raw_data,
        imported_at = NOW()`,
      [
        feedId,
        externalId,
        name,
        locationData.description || null,
        address || null,
        postcode || null,
        lat ? parseFloat(lat) : null,
        lon ? parseFloat(lon) : null,
        locationData.url || null,
        locationData,
      ]
    );
  },

  /**
   * Import OpenActive session
   */
  async importSession(sessionData: any): Promise<void> {
    const locationObj = sessionData.location;
    const locationId = typeof locationObj === 'string' ? locationObj : (locationObj?.['@id'] || locationObj?.id);
    const externalId = sessionData['@id'] || sessionData.id;

    if (!locationId || !externalId) {
      logger.warn({ sessionData }, 'Missing locationId or externalId for session');
      return;
    }

    // Get location ID from external ID
    const locationResult = await db.query(
      'SELECT id FROM openactive_locations WHERE external_id = $1 LIMIT 1',
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      logger.warn({ locationId }, 'OpenActive location not found for session');
      return;
    }

    const openactiveLocationId = locationResult.rows[0].id;

    // Extract session data
    const startDate = sessionData.startDate ? new Date(sessionData.startDate) : null;
    const endDate = sessionData.endDate ? new Date(sessionData.endDate) : null;

    // Insert or update session
    await db.query(
      `INSERT INTO openactive_sessions (
        openactive_location_id, external_id, name, description, activity_type, age_range,
        start_date, end_date, schedule, price, booking_url, availability_status, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (openactive_location_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        activity_type = EXCLUDED.activity_type,
        age_range = EXCLUDED.age_range,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        schedule = EXCLUDED.schedule,
        price = EXCLUDED.price,
        booking_url = EXCLUDED.booking_url,
        availability_status = EXCLUDED.availability_status,
        raw_data = EXCLUDED.raw_data,
        imported_at = NOW()`,
      [
        openactiveLocationId,
        externalId,
        sessionData.name || sessionData.title,
        sessionData.description || null,
        sessionData.activity?.name || sessionData.activityType || null,
        sessionData.ageRange || sessionData.age_range || null,
        startDate,
        endDate,
        sessionData.schedule || null,
        sessionData.price || sessionData.offers?.[0]?.price || null,
        sessionData.url || sessionData.bookingUrl || null,
        (sessionData.availability || sessionData.remainingAttendeeCapacity > 0) ? 'available' : 'full',
        sessionData,
      ]
    );
  },

  /**
   * Get sessions for a venue
   */
  async getSessionsForVenue(venueId: number, limit: number = 10): Promise<OpenActiveSession[]> {
    const result = await db.query(
      `SELECT s.* FROM openactive_sessions s
       JOIN openactive_locations l ON s.openactive_location_id = l.id
       WHERE l.venue_id = $1
       AND (s.start_date >= NOW() OR s.start_date IS NULL)
       ORDER BY s.start_date ASC NULLS LAST
       LIMIT $2`,
      [venueId, limit]
    );
    return result.rows;
  },

  /**
   * Get upcoming sessions by activity type
   */
  async getUpcomingSessions(activityType?: string, limit: number = 20): Promise<OpenActiveSession[]> {
    let query = `
      SELECT s.* FROM openactive_sessions s
      JOIN openactive_locations l ON s.openactive_location_id = l.id
      WHERE (s.start_date >= NOW() OR s.start_date IS NULL)
    `;
    const params: any[] = [];

    if (activityType) {
      query += ` AND s.activity_type = $${params.length + 1}`;
      params.push(activityType);
    }

    query += ` ORDER BY s.start_date ASC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Calculate similarity between two names
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    
    if (n1 === n2) return 1.0;
    
    const words1 = new Set(n1.split(/\s+/));
    const words2 = new Set(n2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
};
