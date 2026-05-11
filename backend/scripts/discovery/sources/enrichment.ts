import { db } from '../../../src/clients/db.js';

export interface EnrichmentResult {
  enriched: number;
  skipped: number;
  failed: number;
}

/**
 * Enrichment pipeline: fills in missing address/postcode data
 * by reverse-geocoding venues that have lat/lon but no postcode.
 * Uses the free Nominatim (OpenStreetMap) reverse geocoding API.
 */
export async function enrichMissingDetails(): Promise<EnrichmentResult> {
  const result: EnrichmentResult = { enriched: 0, skipped: 0, failed: 0 };

  try {
    // Find venues missing postcode or address (batch of 100 — Nominatim allows 1 req/s)
    const { rows: venues } = await db.query(
      `SELECT id, name, lat, lon FROM venues
       WHERE is_active = TRUE
         AND (postcode IS NULL OR postcode = '')
         AND lat != 0 AND lon != 0
       ORDER BY last_scraped ASC NULLS FIRST
       LIMIT 100`
    );

    console.log(`Found ${venues.length} venues needing enrichment.`);

    for (const venue of venues) {
      try {
        // Nominatim requires a 1 second delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${venue.lat}&lon=${venue.lon}&format=json&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'KidSpot-London/1.0 (venue-enrichment)' },
        });

        if (!res.ok) {
          console.warn(`Nominatim returned ${res.status} for venue ${venue.id}`);
          result.failed++;
          continue;
        }

        const data = await res.json() as any;
        const address = data.address || {};
        const postcode = address.postcode || '';
        const road = address.road || '';
        const houseNumber = address.house_number || '';
        const borough = address.suburb || address.city_district || address.town || '';
        const fullAddress = [houseNumber, road].filter(Boolean).join(' ').trim();

        if (!postcode && !fullAddress) {
          result.skipped++;
          continue;
        }

        await db.query(
          `UPDATE venues SET
             postcode = COALESCE(NULLIF($1, ''), postcode),
             address = COALESCE(NULLIF($2, ''), address),
             borough = COALESCE(NULLIF($3, ''), borough),
             enriched_at = NOW()
           WHERE id = $4`,
          [postcode, fullAddress, borough, venue.id]
        );

        console.log(`Enriched: ${venue.name} → ${postcode}, ${fullAddress}, ${borough}`);
        result.enriched++;
      } catch (err: any) {
        console.error(`Failed to enrich venue ${venue.name}:`, err.message);
        result.failed++;
      }
    }
  } catch (err: any) {
    console.error('Enrichment pipeline error:', err.message);
    throw err;
  }

  return result;
}
