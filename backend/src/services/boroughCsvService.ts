import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';
import { BoroughCsvSource, BoroughCsvRecord, ParsedCsvRecord } from '../types/venue.js';

export const boroughCsvService = {
  /**
   * Get all active borough CSV sources
   */
  async getActiveSources(): Promise<BoroughCsvSource[]> {
    const result = await db.query(
      'SELECT * FROM borough_csv_sources WHERE is_active = TRUE ORDER BY borough_name, dataset_name'
    );
    return result.rows;
  },

  /**
   * Get borough CSV source by ID
   */
  async getSource(id: number): Promise<BoroughCsvSource | null> {
    const result = await db.query(
      'SELECT * FROM borough_csv_sources WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Download and parse CSV from URL
   */
  async downloadAndParseCsv(url: string): Promise<ParsedCsvRecord[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      return this.parseCsv(csvText);
    } catch (error) {
      logger.error({ err: error, url }, 'Failed to download and parse CSV');
      throw error;
    }
  },

  /**
   * Parse CSV text into records
   */
  parseCsv(csvText: string): ParsedCsvRecord[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCsvLine(lines[0]);
    const records: ParsedCsvRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const raw: any = {};

      headers.forEach((header, index) => {
        raw[header] = values[index] || null;
      });

      // Try to extract common fields
      const record: ParsedCsvRecord = {
        name: this.extractName(raw),
        address: this.extractAddress(raw),
        postcode: this.extractPostcode(raw),
        lat: this.extractLat(raw),
        lon: this.extractLon(raw),
        external_id: this.extractExternalId(raw),
        raw,
      };

      if (record.name) {
        records.push(record);
      }
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
   * Extract name from raw CSV data
   */
  extractName(raw: any): string {
    const nameFields = ['name', 'Name', 'NAME', 'title', 'Title', 'TITLE', 'facility_name', 'Facility Name'];
    for (const field of nameFields) {
      if (raw[field]) return String(raw[field]).trim();
    }
    return '';
  },

  /**
   * Extract address from raw CSV data
   */
  extractAddress(raw: any): string | undefined {
    const addressFields = ['address', 'Address', 'ADDRESS', 'location', 'Location', 'LOCATION', 'Site Address'];
    for (const field of addressFields) {
      if (raw[field]) return String(raw[field]).trim();
    }
    return undefined;
  },

  /**
   * Extract postcode from raw CSV data
   */
  extractPostcode(raw: any): string | undefined {
    const postcodeFields = ['postcode', 'Postcode', 'POSTCODE', 'post_code', 'Post Code', 'zip', 'Zip', 'Post Code'];
    for (const field of postcodeFields) {
      if (raw[field]) {
        const val = String(raw[field]).trim();
        if (val) return this.normalizePostcode(val);
      }
    }
    return undefined;
  },

  /**
   * Extract latitude from raw CSV data
   */
  extractLat(raw: any): number | undefined {
    const latFields = ['lat', 'latitude', 'Latitude', 'LATITUDE', 'y', 'Y', 'Lat'];
    for (const field of latFields) {
      const value = parseFloat(raw[field]);
      if (!isNaN(value)) return value;
    }
    return undefined;
  },

  /**
   * Extract longitude from raw CSV data
   */
  extractLon(raw: any): number | undefined {
    const lonFields = ['lon', 'longitude', 'Longitude', 'LONGITUDE', 'x', 'X', 'Long', 'Lon'];
    for (const field of lonFields) {
      const value = parseFloat(raw[field]);
      if (!isNaN(value)) return value;
    }
    return undefined;
  },

  /**
   * Extract external ID from raw CSV data
   */
  extractExternalId(raw: any): string | undefined {
    const idFields = ['id', 'ID', 'Id', 'reference', 'Reference', 'ref', 'Ref', 'Facility ID'];
    for (const field of idFields) {
      if (raw[field]) return String(raw[field]).trim();
    }
    return undefined;
  },

  /**
   * Normalize postcode format
   */
  normalizePostcode(postcode: string): string {
    return postcode.toUpperCase().replace(/\s+/g, ' ').trim();
  },

  /**
   * Geocode postcode using Postcodes.io
   */
  async geocodePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const normalized = this.normalizePostcode(postcode);
      // Remove space for the API call if it's there, postcodes.io handles both but usually it's cleaner
      const pc = normalized.replace(/\s+/g, '');
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
      const data = await response.json() as any;

      if (data.status === 200 && data.result) {
        return {
          lat: data.result.latitude,
          lon: data.result.longitude,
        };
      }
    } catch (error) {
      logger.error({ err: error, postcode }, 'Failed to geocode postcode via Postcodes.io');
    }
    return null;
  },

  /**
   * Calculate similarity between two names (simple Jaro-Winkler or Levenshtein-based)
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

  /**
   * Import borough CSV records into the tracking table
   */
  async importRecords(sourceId: number, records: ParsedCsvRecord[]): Promise<{
    imported: number;
    skipped: number;
    failed: number;
  }> {
    const metrics = { imported: 0, skipped: 0, failed: 0 };

    for (const record of records) {
      try {
        // Check if already imported
        // If external_id is missing, use name as external_id to avoid duplicates in the same source
        const externalId = record.external_id || record.name;
        
        const existing = await db.query(
          'SELECT id FROM borough_csv_records WHERE borough_csv_source_id = $1 AND external_id = $2',
          [sourceId, externalId]
        );

        if (existing.rows.length > 0) {
          metrics.skipped++;
          continue;
        }

        // Geocode if missing coordinates
        let lat = record.lat;
        let lon = record.lon;

        if (!lat || !lon) {
          if (record.postcode) {
            const coords = await this.geocodePostcode(record.postcode);
            if (coords) {
              lat = coords.lat;
              lon = coords.lon;
            }
          }
        }

        // Insert record
        await db.query(
          `INSERT INTO borough_csv_records (
            borough_csv_source_id, external_id, name, address, postcode, lat, lon, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sourceId,
            externalId,
            record.name,
            record.address || null,
            record.postcode || null,
            lat || null,
            lon || null,
            record.raw,
          ]
        );

        metrics.imported++;
      } catch (error) {
        logger.error({ err: error, record }, 'Failed to import borough CSV record');
        metrics.failed++;
      }
    }

    // Update source stats
    await db.query('SELECT update_borough_csv_stats($1, $2)', [sourceId, records.length]);

    return metrics;
  },
};
