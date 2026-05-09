import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

export interface OperatorPartnership {
  id: number;
  operator_name: string;
  operator_type: string;
  partnership_type: string;
  data_source_url: string | null;
  data_source_type: string | null;
  licence_name: string | null;
  licence_url: string | null;
  contact_email: string | null;
  is_active: boolean;
  confidence_level: string;
  created_at: Date;
  updated_at: Date;
}

export interface OperatorCrawlLog {
  id: number;
  operator_partnership_id: number;
  crawl_url: string;
  tos_version: string | null;
  user_agent: string | null;
  crawl_status: string;
  venues_found: number;
  venues_imported: number;
  error_message: string | null;
  crawled_at: Date;
}

export interface OperatorVenue {
  id: number;
  operator_partnership_id: number;
  external_id: string;
  name: string;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  listing_url: string | null;
  last_verified_at: Date | null;
  venue_id: number | null;
  raw_data: any;
  imported_at: Date;
}

export const operatorService = {
  /**
   * Get all active operator partnerships
   */
  async getActivePartnerships(): Promise<OperatorPartnership[]> {
    const result = await db.query(
      'SELECT * FROM operator_partnerships WHERE is_active = TRUE ORDER BY operator_name'
    );
    return result.rows;
  },

  /**
   * Get operator partnership by ID
   */
  async getPartnership(id: number): Promise<OperatorPartnership | null> {
    const result = await db.query(
      'SELECT * FROM operator_partnerships WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Import partner data (CSV, JSON, API)
   */
  async importPartnerData(partnershipId: number): Promise<{
    venues_imported: number;
    failed: number;
  }> {
    const metrics = { venues_imported: 0, failed: 0 };

    // Get partnership details
    const partnership = await this.getPartnership(partnershipId);
    if (!partnership) {
      throw new Error('Operator partnership not found');
    }

    try {
      // Fetch data based on partnership type
      let venues: any[] = [];

      if (partnership.partnership_type === 'csv' || partnership.data_source_type === 'csv') {
        if (partnership.data_source_url) {
          venues = await this.fetchCsvData(partnership.data_source_url);
        }
      } else if (partnership.partnership_type === 'api' || partnership.data_source_type === 'json') {
        if (partnership.data_source_url) {
          venues = await this.fetchJsonData(partnership.data_source_url);
        }
      } else if (partnership.partnership_type === 'crawler') {
        throw new Error('Crawling requires legal review - use crawlOperatorLocator instead');
      }

      // Import venues
      for (const venue of venues) {
        try {
          await this.importOperatorVenue(partnershipId, venue, partnership.data_source_url || '');
          metrics.venues_imported++;
        } catch (error) {
          logger.error({ err: error, venue }, 'Failed to import operator venue');
          metrics.failed++;
        }
      }

      // Update partnership stats
      await db.query('SELECT update_operator_partnership_stats($1, $2)', [partnershipId, metrics.venues_imported]);

      logger.info({ partnershipId, metrics }, 'Operator partner data import complete');

      return metrics;
    } catch (error) {
      logger.error({ err: error, partnershipId }, 'Failed to import operator partner data');
      throw error;
    }
  },

  /**
   * Fetch CSV data from URL
   */
  async fetchCsvData(url: string): Promise<any[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    return this.parseCsv(csvText);
  },

  /**
   * Parse CSV text into records
   */
  parseCsv(csvText: string): any[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCsvLine(lines[0]);
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const record: any = {};

      headers.forEach((header, index) => {
        record[header] = values[index] || null;
      });

      records.push(record);
    }

    return records;
  },

  /**
   * Parse CSV line (handle quoted values)
   */
  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  /**
   * Fetch JSON data from URL
   */
  async fetchJsonData(url: string): Promise<any[]> {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status}`);
    }

    const data = await response.json() as any;

    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (data.venues && Array.isArray(data.venues)) {
      return data.venues;
    } else if (data.locations && Array.isArray(data.locations)) {
      return data.locations;
    } else {
      throw new Error('Unknown JSON structure');
    }
  },

  /**
   * Import operator venue
   */
  async importOperatorVenue(
    partnershipId: number,
    venueData: any,
    listingUrl: string
  ): Promise<void> {
    const externalId = (venueData.id || venueData.external_id || venueData.slug || venueData.name).toString();
    const name = venueData.name || venueData.title;

    // Extract geo data
    const lat = parseFloat(venueData.lat || venueData.latitude || venueData.geo?.lat);
    const lon = parseFloat(venueData.lon || venueData.longitude || venueData.geo?.lon);

    // Extract address
    const address = venueData.address || venueData.street_address || venueData.location?.address;
    const postcode = venueData.postcode || venueData.post_code || venueData.location?.postcode;

    // Insert or update operator venue
    await db.query(
      `INSERT INTO operator_venues (
        operator_partnership_id, external_id, name, address, postcode, lat, lon,
        phone, website, listing_url, last_verified_at, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      ON CONFLICT (operator_partnership_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        postcode = EXCLUDED.postcode,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        listing_url = EXCLUDED.listing_url,
        last_verified_at = NOW(),
        raw_data = EXCLUDED.raw_data`,
      [
        partnershipId,
        externalId,
        name,
        address || null,
        postcode || null,
        isNaN(lat) ? null : lat,
        isNaN(lon) ? null : lon,
        venueData.phone || null,
        venueData.website || venueData.url || null,
        listingUrl,
        venueData,
      ]
    );
  },

  /**
   * Crawl operator locator (after legal review)
   */
  async crawlOperatorLocator(
    partnershipId: number,
    tosVersion: string
  ): Promise<{
    venues_found: number;
    venues_imported: number;
    failed: number;
  }> {
    const metrics = { venues_found: 0, venues_imported: 0, failed: 0 };

    // Get partnership details
    const partnership = await this.getPartnership(partnershipId);
    if (!partnership) {
      throw new Error('Operator partnership not found');
    }

    if (partnership.partnership_type !== 'crawler') {
      throw new Error('Partnership is not configured for crawling');
    }

    if (!partnership.data_source_url) {
      throw new Error('Data source URL missing for crawling');
    }

    const crawlLogId = await this.logCrawlStart(partnershipId, partnership.data_source_url, tosVersion);

    try {
      // Fetch and parse HTML
      const response = await fetch(partnership.data_source_url, {
        headers: {
          'User-Agent': 'KidSpotLondon/1.0 (https://kidspot.london; data-partnership@kidspot.london)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to crawl: ${response.status}`);
      }

      const html = await response.text();
      const venues = this.parseHtmlForVenues(html, partnership.operator_name);

      metrics.venues_found = venues.length;

      // Import venues
      for (const venue of venues) {
        try {
          await this.importOperatorVenue(partnershipId, venue, partnership.data_source_url);
          metrics.venues_imported++;
        } catch (error) {
          logger.error({ err: error, venue }, 'Failed to import crawled operator venue');
          metrics.failed++;
        }
      }

      // Update crawl log
      await this.logCrawlComplete(crawlLogId, 'success', metrics.venues_found, metrics.venues_imported);

      logger.info({ partnershipId, metrics }, 'Operator locator crawl complete');

      return metrics;
    } catch (error) {
      await this.logCrawlComplete(crawlLogId, 'failed', metrics.venues_found, metrics.venues_imported, (error as Error).message);
      logger.error({ err: error, partnershipId }, 'Failed to crawl operator locator');
      throw error;
    }
  },

  /**
   * Parse HTML for venue data (basic implementation)
   */
  parseHtmlForVenues(html: string, operatorName: string): any[] {
    // This is a basic implementation - in production, use a proper HTML parser
    // For now, return empty array as crawling requires legal review
    logger.warn({ operatorName }, 'HTML parsing not implemented - requires legal review for crawling');
    return [];
  },

  /**
   * Log crawl start
   */
  async logCrawlStart(
    partnershipId: number,
    crawlUrl: string,
    tosVersion: string
  ): Promise<number> {
    const result = await db.query(
      `INSERT INTO operator_crawl_log (operator_partnership_id, crawl_url, tos_version, user_agent, crawl_status)
       VALUES ($1, $2, $3, $4, 'in_progress')
       RETURNING id`,
      [
        partnershipId,
        crawlUrl,
        tosVersion,
        'KidSpotLondon/1.0 (https://kidspot.london; data-partnership@kidspot.london)',
      ]
    );
    return result.rows[0].id;
  },

  /**
   * Log crawl complete
   */
  async logCrawlComplete(
    crawlLogId: number,
    status: string,
    venuesFound: number,
    venuesImported: number,
   errorMessage?: string
  ): Promise<void> {
    await db.query(
      `UPDATE operator_crawl_log
       SET crawl_status = $1, venues_found = $2, venues_imported = $3, error_message = $4
       WHERE id = $5`,
      [status, venuesFound, venuesImported, errorMessage || null, crawlLogId]
    );
  },

  /**
   * Calculate similarity between two names
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    
    if (n1 === n2) return 1.0;
    
    // Simple overlap-based similarity
    const words1 = new Set(n1.split(/\s+/));
    const words2 = new Set(n2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  },
};
