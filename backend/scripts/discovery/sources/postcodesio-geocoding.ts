import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';

export interface PostcodesioGeocodingResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

interface PostcodesIoResponse {
  status: number;
  result?: {
    latitude: number;
    longitude: number;
    postcode: string;
    region?: string;
    admin_district?: string;
    parish?: string;
  };
  error?: string;
}

interface BulkGeolocationRequest {
  geolocations: Array<{
    latitude: number;
    longitude: number;
    limit: number;
  }>;
}

interface BulkGeolocationResponse {
  status: number;
  result?: Array<{
    query: { latitude: number; longitude: number };
    result?: Array<{
      postcode: string;
      latitude: number;
      longitude: number;
      region?: string;
      admin_district?: string;
    }>;
  }>;
  error?: string;
}

const POSTCODES_API_BASE = 'https://api.postcodes.io';

/**
 * Reverse geocode by postcode: fetch lat/lon from postcodes.io.
 */
async function geocodePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
  const encoded = encodeURIComponent(postcode);
  const response = await fetch(`${POSTCODES_API_BASE}/postcodes/${encoded}`);

  if (!response.ok) {
    if (response.status === 404) {
      logger.warn({ postcode }, 'Postcode not found');
      return null;
    }
    logger.error({ postcode, status: response.status }, 'Postcodes.io request failed');
    return null;
  }

  const data = await response.json() as PostcodesIoResponse;
  if (!data.result) return null;

  return { lat: data.result.latitude, lon: data.result.longitude };
}

/**
 * Forward geocode by lat/lon: fetch postcode from postcodes.io bulk API.
 */
async function reverseGeocodeBatch(
  coordinates: Array<{ id: number; lat: number; lon: number }>
): Promise<Map<number, string | null>> {
  const results = new Map<number, string | null>();

  // Batch into groups of 100 (postcodes.io bulk limit)
  for (let i = 0; i < coordinates.length; i += 100) {
    const batch = coordinates.slice(i, i + 100);

    const body: BulkGeolocationRequest = {
      geolocations: batch.map(c => ({
        latitude: c.lat,
        longitude: c.lon,
        limit: 1
      }))
    };

    const response = await fetch(`${POSTCODES_API_BASE}/postcodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      logger.error({ status: response.status, batch: i }, 'Postcodes.io bulk reverse geocode failed');
      batch.forEach(c => results.set(c.id, null));
      continue;
    }

    const data = await response.json() as BulkGeolocationResponse;
    if (!data.result) {
      batch.forEach(c => results.set(c.id, null));
      continue;
    }

    data.result.forEach((item, idx) => {
      const coord = batch[idx];
      if (item.result && item.result.length > 0 && item.result[0].postcode) {
        results.set(coord.id, item.result[0].postcode);
      } else {
        results.set(coord.id, null);
      }
    });
  }

  return results;
}

/**
 * Postcodes.io geocoding pipeline
 *
 * Two passes:
 * 1. Forward: venues with postcode but missing lat/lon → fetch coordinates
 * 2. Reverse: venues with lat/lon but missing postcode → fetch postcodes
 */
export async function geocodeViaPostcodesIo(batchSize: number = 100): Promise<PostcodesioGeocodingResult> {
  const result: PostcodesioGeocodingResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  try {
    // === Pass 1: Forward geocoding (postcode → lat/lon) ===
    logger.info('Starting forward geocoding pass: postcode → lat/lon');

    const { rows: forwardVenues } = await db.query(
      `SELECT id, postcode FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
         AND postcode IS NOT NULL AND postcode != ''
         AND (lat IS NULL OR lon IS NULL)
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (forwardVenues.length > 0) {
      logger.info({ count: forwardVenues.length }, 'Found venues needing forward geocoding');

      for (const venue of forwardVenues) {
        result.totalProcessed++;

        try {
          await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limit

          const coords = await geocodePostcode(venue.postcode);

          if (!coords) {
            result.skipped++;
            continue;
          }

          await db.query(
            `UPDATE venues SET
               lat = COALESCE($1, lat),
               lon = COALESCE($2, lon),
               enriched_at = NOW()
             WHERE id = $3`,
            [coords.lat, coords.lon, venue.id]
          );

          result.enriched++;
          logger.info(`  ✓ Geocoded venue ${venue.id}: postcode ${venue.postcode} → (${coords.lat}, ${coords.lon})`);
        } catch (err: any) {
          logger.error({ err, venueId: venue.id, postcode: venue.postcode }, 'Error forward geocoding venue');
          result.failed++;
        }
      }
    } else {
      logger.info('No venues need forward geocoding.');
    }

    // === Pass 2: Reverse geocoding (lat/lon → postcode) ===
    logger.info('Starting reverse geocoding pass: lat/lon → postcode');

    const { rows: reverseVenues } = await db.query(
      `SELECT id, lat, lon FROM venues
       WHERE is_active = TRUE
         AND venue_scope = 'core'
         AND lat IS NOT NULL AND lon IS NOT NULL
         AND (postcode IS NULL OR postcode = '')
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (reverseVenues.length > 0) {
      logger.info({ count: reverseVenues.length }, 'Found venues needing reverse geocoding');

      const coordinates = reverseVenues.map((v: any) => ({
        id: v.id,
        lat: parseFloat(v.lat),
        lon: parseFloat(v.lon)
      }));

      // Rate limit before bulk call
      await new Promise((resolve) => setTimeout(resolve, 200));

      const postcodeMap = await reverseGeocodeBatch(coordinates);

      for (const venue of reverseVenues) {
        result.totalProcessed++;

        try {
          const postcode = postcodeMap.get(venue.id);

          if (!postcode) {
            result.skipped++;
            continue;
          }

          await db.query(
            `UPDATE venues SET
               postcode = COALESCE(NULLIF($1, ''), postcode),
               enriched_at = NOW()
             WHERE id = $2`,
            [postcode, venue.id]
          );

          result.enriched++;
          logger.info(`  ✓ Reverse geocoded venue ${venue.id}: (${venue.lat}, ${venue.lon}) → ${postcode}`);
        } catch (err: any) {
          logger.error({ err, venueId: venue.id }, 'Error reverse geocoding venue');
          result.failed++;
        }
      }
    } else {
      logger.info('No venues need reverse geocoding.');
    }
  } catch (err: any) {
    logger.error({ err }, 'Postcodes.io geocoding pipeline error');
    throw err;
  }

  logger.info(result, 'Postcodes.io geocoding batch completed.');
  return result;
}

// Allow running directly
import { fileURLToPath } from 'url';
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);
  const batchSizeIndex = args.indexOf('--batch-size');
  const batchSize = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1], 10) || 100 : 100;
  geocodeViaPostcodesIo(batchSize)
    .then((res) => {
      logger.info(res, 'Geocoding complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Geocoding failed');
      process.exit(1);
    });
}
