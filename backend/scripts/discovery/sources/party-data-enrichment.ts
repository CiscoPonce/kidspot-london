/**
 * Phase 18D: Party Data Enrichment (the party-product data spine).
 *
 * Crawls party-eligible venue websites (and likely /parties subpages), extracts
 * validated party data via partyExtraction (regex pre-pass + NVIDIA fallback),
 * and UPSERTs the party_* columns with COALESCE/NULLIF safety so a verified
 * value is never overwritten by null/empty.
 */

import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { crawlDelay } from '../../../src/utils/rateLimiter.js';
import { extractPartyData } from '../../../src/utils/partyExtraction.js';
import { fetchPage, normalizeUrl, isCrawlable } from './direct-crawl-enrichment.js';

export interface PartyEnrichResult {
  enriched: number;
  notCapable: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

const PARTY_TYPES = ['softplay', 'community_hall', 'leisure_centre', 'museum', 'cafe'];

// Pages most likely to carry party info; the homepage anchors usually link out
// to these, but probing directly raises yield for sparse sites.
const PARTY_PATHS = [
  '',
  '/parties',
  '/party',
  '/birthday-parties',
  '/birthday',
  '/kids-parties',
  '/childrens-parties',
  '/celebrations',
];

const MAX_HTML = 60000;

/**
 * Party-data enrichment pass. Targets active party-eligible venues with a
 * website whose party data is missing or stale (>30 days).
 */
export async function enrichPartyData(batchSize: number = 50): Promise<PartyEnrichResult> {
  const result: PartyEnrichResult = {
    enriched: 0,
    notCapable: 0,
    skipped: 0,
    failed: 0,
    totalProcessed: 0,
  };

  const { rows: venues } = await db.query(
    `SELECT id, name, type, website
     FROM venues
     WHERE is_active = TRUE
       AND type = ANY($2)
       AND website IS NOT NULL AND website != ''
       AND website ILIKE 'http%'
       AND website NOT ILIKE '%openstreetmap.org%'
       AND website NOT ILIKE '%facebook.com%'
       AND website NOT ILIKE '%instagram.com%'
       AND website NOT ILIKE '%yelp.%'
       AND website NOT ILIKE '%tripadvisor.%'
       AND website NOT ILIKE '%example%'
       AND (party_extracted_at IS NULL OR party_extracted_at < NOW() - INTERVAL '30 days')
     ORDER BY
       CASE WHEN venue_scope = 'core' THEN 0 ELSE 1 END,
       CASE type
         WHEN 'softplay' THEN 1
         WHEN 'leisure_centre' THEN 2
         WHEN 'community_hall' THEN 3
         WHEN 'museum' THEN 4
         ELSE 5
       END,
       id ASC
     LIMIT $1`,
    [batchSize, PARTY_TYPES],
  );

  if (venues.length === 0) {
    logger.info('No venues require party-data extraction.');
    return result;
  }

  logger.info(`Party data: ${venues.length} party-eligible venues to process.`);

  for (const venue of venues) {
    result.totalProcessed++;

    if (!isCrawlable(venue.website)) {
      await db.query(`UPDATE venues SET party_extracted_at = NOW() WHERE id = $1`, [venue.id]);
      result.skipped++;
      continue;
    }

    try {
      await crawlDelay(800);

      let combinedHtml = '';
      for (const path of PARTY_PATHS) {
        if (combinedHtml.length > MAX_HTML) break;
        const url = normalizeUrl(venue.website, path);
        const html = await fetchPage(url);
        if (html) combinedHtml += `\n${html}`;
      }

      if (!combinedHtml) {
        await db.query(`UPDATE venues SET party_extracted_at = NOW() WHERE id = $1`, [venue.id]);
        result.skipped++;
        continue;
      }

      const data = await extractPartyData({
        name: venue.name,
        website: venue.website,
        html: combinedHtml.slice(0, MAX_HTML),
      });

      await db.query(
        `UPDATE venues SET
           party_capable      = COALESCE($1, party_capable),
           party_price_from   = COALESCE($2, party_price_from),
           party_price_unit   = COALESCE($3, party_price_unit),
           party_max_capacity = COALESCE($4, party_max_capacity),
           party_packages     = COALESCE($5::jsonb, party_packages),
           party_enquiry_url  = COALESCE(NULLIF($6, ''), party_enquiry_url),
           booking_url        = COALESCE(booking_url, NULLIF($6, '')),
           party_source       = $7,
           party_extracted_at = NOW()
         WHERE id = $8`,
        [
          data.partyCapable,
          data.priceFrom,
          data.priceUnit,
          data.maxCapacity,
          data.packages.length ? JSON.stringify(data.packages) : null,
          data.enquiryUrl,
          data.source,
          venue.id,
        ],
      );

      if (data.partyCapable === true) {
        result.enriched++;
        logger.info(
          {
            venueId: venue.id,
            name: venue.name,
            price: data.priceFrom,
            cap: data.maxCapacity,
            link: !!data.enquiryUrl,
            src: data.source,
          },
          '  ✓ party-capable',
        );
      } else {
        result.notCapable++;
      }
    } catch (err: any) {
      logger.error({ err, venueId: venue.id, name: venue.name }, 'Party data extraction failed');
      await db.query(`UPDATE venues SET party_extracted_at = NOW() WHERE id = $1`, [venue.id]);
      result.failed++;
    }
  }

  logger.info(result, 'Party data batch completed.');
  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = Number.parseInt(process.argv[2] ?? '', 10);
  enrichPartyData(Number.isFinite(n) && n > 0 ? n : 10)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
