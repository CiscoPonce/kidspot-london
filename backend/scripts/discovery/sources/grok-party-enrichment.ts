/**
 * Grok-powered Party & Venue Data Enrichment.
 *
 * Replaces Google Places API dependency by extracting verified, real-world
 * birthday party details (prices, capacity, packages, catering/BYO policies,
 * opening hours, contact info, and factual descriptions) from venue websites
 * using the VPS-installed Grok CLI (`grok -p --output-format json --json-schema`).
 *
 * Usage (on VPS host where `grok` is installed and Postgres is on 127.0.0.1:5432):
 *   npx tsx scripts/discovery/sources/grok-party-enrichment.ts [batchSize] [--web-search] [--dry-run]
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { crawlDelay } from '../../../src/utils/rateLimiter.js';
import { fetchPage, normalizeUrl, isCrawlable } from './direct-crawl-enrichment.js';

const execFileAsync = promisify(execFile);

const GROK_BIN = process.env.GROK_BIN || '/home/ubuntu/.grok/bin/grok';
const AGY_BIN = process.env.AGY_BIN || '/home/ubuntu/.local/bin/agy';
const GROK_TIMEOUT_MS = 60_000;
const MAX_TEXT_CHARS = 12_000;
const SYSTEM_INSTRUCTION =
  'You are a strict factual data extractor for a London kids birthday party directory. Return ONLY verified facts present in the provided text or official venue page. Never guess or invent prices, capacities, or policies; use null if not explicitly stated.';

const PARTY_PATHS = [
  '',
  '/parties',
  '/party',
  '/birthday-parties',
  '/birthday',
  '/kids-parties',
  '/childrens-parties',
  '/hire',
];

const EXTRACTION_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    party_capable: { type: ['boolean', 'null'] },
    party_price_from: { type: ['number', 'null'] },
    party_price_unit: { type: ['string', 'null'], enum: ['per_child', 'per_hour', 'flat', null] },
    party_max_capacity: { type: ['integer', 'null'] },
    party_packages: { type: 'array', items: { type: 'string' } },
    party_enquiry_url: { type: ['string', 'null'] },
    byo_food_allowed: { type: ['boolean', 'null'] },
    food_provided: { type: ['boolean', 'null'] },
    kitchen_facilities: { type: ['boolean', 'null'] },
    catering_notes: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    opening_hours: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    source_url: { type: ['string', 'null'] },
  },
  required: [
    'party_capable',
    'party_price_from',
    'party_price_unit',
    'party_max_capacity',
    'party_packages',
    'party_enquiry_url',
    'byo_food_allowed',
    'food_provided',
    'kitchen_facilities',
    'catering_notes',
    'description',
    'opening_hours',
    'phone',
    'email',
    'source_url',
  ],
  additionalProperties: false,
});

const AGY_EXTRACTION_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    party_capable: { type: ['boolean', 'null'] },
    party_price_from: { type: ['number', 'null'] },
    party_price_unit: { type: ['string', 'null'], enum: ['per_child', 'per_hour', 'flat'] },
    party_max_capacity: { type: ['integer', 'null'] },
    party_packages: { type: 'array', items: { type: 'string' } },
    party_enquiry_url: { type: ['string', 'null'] },
    byo_food_allowed: { type: ['boolean', 'null'] },
    food_provided: { type: ['boolean', 'null'] },
    kitchen_facilities: { type: ['boolean', 'null'] },
    catering_notes: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    opening_hours: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    source_url: { type: ['string', 'null'] },
  },
  required: [
    'party_capable',
    'party_price_from',
    'party_price_unit',
    'party_max_capacity',
    'party_packages',
    'party_enquiry_url',
    'byo_food_allowed',
    'food_provided',
    'kitchen_facilities',
    'catering_notes',
    'description',
    'opening_hours',
    'phone',
    'email',
    'source_url',
  ],
  additionalProperties: false,
});

export interface GrokExtraction {
  party_capable: boolean | null;
  party_price_from: number | null;
  party_price_unit: 'per_child' | 'per_hour' | 'flat' | null;
  party_max_capacity: number | null;
  party_packages: string[];
  party_enquiry_url: string | null;
  byo_food_allowed: boolean | null;
  food_provided: boolean | null;
  kitchen_facilities: boolean | null;
  catering_notes: string | null;
  description: string | null;
  opening_hours: string | null;
  phone: string | null;
  email: string | null;
  source_url: string | null;
}

export interface GrokEnrichResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
  totalCostUsd: number;
}

interface VenueRow {
  id: number;
  name: string;
  type: string;
  borough: string | null;
  postcode: string | null;
  website: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  opening_hours: string | null;
  party_price_from: string | null;
  party_max_capacity: number | null;
  party_packages: unknown;
  party_enquiry_url: string | null;
}

function htmlToCleanText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function validUrl(u: string | null | undefined): string | null {
  if (!u || typeof u !== 'string') return null;
  const trimmed = u.trim();
  return /^https?:\/\/.+/i.test(trimmed) ? trimmed.slice(0, 500) : null;
}

function cleanStr(s: string | null | undefined, maxLen: number): string | null {
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLen) : null;
}

function validateExtraction(raw: Partial<GrokExtraction>): GrokExtraction {
  const price =
    typeof raw.party_price_from === 'number' &&
    Number.isFinite(raw.party_price_from) &&
    raw.party_price_from >= 1 &&
    raw.party_price_from <= 2000
      ? Math.round(raw.party_price_from * 100) / 100
      : null;

  const unit =
    raw.party_price_unit === 'per_child' ||
    raw.party_price_unit === 'per_hour' ||
    raw.party_price_unit === 'flat'
      ? raw.party_price_unit
      : null;

  const cap =
    typeof raw.party_max_capacity === 'number' &&
    Number.isInteger(raw.party_max_capacity) &&
    raw.party_max_capacity >= 1 &&
    raw.party_max_capacity <= 1000
      ? raw.party_max_capacity
      : null;

  const packages = Array.isArray(raw.party_packages)
    ? raw.party_packages
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 1)
        .map((p) => p.trim().slice(0, 80))
        .slice(0, 8)
    : [];

  const email =
    typeof raw.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email.trim())
      ? raw.email.trim().slice(0, 120)
      : null;

  return {
    party_capable: typeof raw.party_capable === 'boolean' ? raw.party_capable : null,
    party_price_from: price,
    party_price_unit: price !== null ? unit : null,
    party_max_capacity: cap,
    party_packages: packages,
    party_enquiry_url: validUrl(raw.party_enquiry_url),
    byo_food_allowed: typeof raw.byo_food_allowed === 'boolean' ? raw.byo_food_allowed : null,
    food_provided: typeof raw.food_provided === 'boolean' ? raw.food_provided : null,
    kitchen_facilities:
      typeof raw.kitchen_facilities === 'boolean' ? raw.kitchen_facilities : null,
    catering_notes: cleanStr(raw.catering_notes, 240),
    description: cleanStr(raw.description, 320),
    opening_hours: cleanStr(raw.opening_hours, 200),
    phone: cleanStr(raw.phone, 40),
    email,
    source_url: validUrl(raw.source_url),
  };
}

function parseJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Handle trailing text or multiple JSON objects emitted by CLI
    const start = trimmed.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in Grok output');
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return JSON.parse(trimmed.slice(start, i + 1)) as T;
        }
      }
    }
    throw new Error('Unterminated JSON object in Grok output');
  }
}

async function callGrokExtractor(
  prompt: string,
  allowWebSearch: boolean,
): Promise<{ data: GrokExtraction; costUsd: number }> {
  const args = [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--json-schema',
    EXTRACTION_SCHEMA,
    '--disallowed-tools',
    'bash,edit,write,read',
    '--system-prompt-override',
    SYSTEM_INSTRUCTION,
  ];

  if (!allowWebSearch) {
    args.push('--disable-web-search');
  }

  const { stdout } = await execFileAsync(GROK_BIN, args, {
    timeout: GROK_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
  });

  const envelope = parseJsonObject<{
    text?: string;
    total_cost_usd?: number;
  }>(stdout);
  const costUsd = typeof envelope.total_cost_usd === 'number' ? envelope.total_cost_usd : 0;
  const parsed = parseJsonObject<Partial<GrokExtraction>>(envelope.text || '{}');
  return { data: validateExtraction(parsed), costUsd };
}

async function callAgyExtractor(
  prompt: string,
): Promise<{ data: GrokExtraction; costUsd: number }> {
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${prompt}`;
  const args = [
    '--output-format',
    'json',
    '--json-schema',
    AGY_EXTRACTION_SCHEMA,
    '--disable-slash-commands',
    `--print-timeout=60s`,
    `-p=${fullPrompt}`,
  ];

  const { stdout } = await execFileAsync(AGY_BIN, args, {
    timeout: GROK_TIMEOUT_MS + 10_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  const envelope = parseJsonObject<{
    status?: string;
    response?: string;
    structured_output?: Partial<GrokExtraction>;
  }>(stdout);
  if (envelope.status && envelope.status !== 'SUCCESS') {
    throw new Error(`agy exited with status ${envelope.status}`);
  }
  const parsed =
    envelope.structured_output && typeof envelope.structured_output === 'object'
      ? envelope.structured_output
      : parseJsonObject<Partial<GrokExtraction>>(envelope.response || '{}');
  return { data: validateExtraction(parsed), costUsd: 0 };
}

async function crawlVenueText(website: string): Promise<{ text: string; matchedUrl: string }> {
  let combined = '';
  let matchedUrl = website;

  for (const path of PARTY_PATHS) {
    if (combined.length >= MAX_TEXT_CHARS) break;
    const url = normalizeUrl(website, path);
    const html = await fetchPage(url);
    if (!html) continue;

    const text = htmlToCleanText(html);
    if (text.length < 100) continue;

    if (path && /part|birthday|hire/i.test(text)) {
      matchedUrl = url;
    }
    combined += `\n--- PAGE: ${url} ---\n${text.slice(0, 4000)}`;
  }

  return { text: combined.slice(0, MAX_TEXT_CHARS).trim(), matchedUrl };
}

async function logProvenance(
  venueId: number,
  field: string,
  oldVal: string | null,
  newVal: string | null,
  reason: string,
): Promise<void> {
  if (!newVal || oldVal === newVal) return;
  await db.query(
    `INSERT INTO venue_provenance_log (venue_id, field_name, old_value, new_value, source, changed_by, reason)
     VALUES ($1, $2, $3, $4, 'grok_party_extract', 'grok-cli', $5)`,
    [venueId, field, oldVal, newVal, reason],
  );
}

export async function enrichWithGrok(
  batchSize = 10,
  options: { allowWebSearch?: boolean; dryRun?: boolean; cli?: 'grok' | 'agy' } = {},
): Promise<GrokEnrichResult> {
  const { allowWebSearch = false, dryRun = false, cli = 'grok' } = options;
  const result: GrokEnrichResult = {
    enriched: 0,
    skipped: 0,
    failed: 0,
    totalProcessed: 0,
    totalCostUsd: 0,
  };

  const { rows } = await db.query(
    `SELECT id, name, type, borough, postcode, website, phone, email,
            description, opening_hours, party_price_from, party_max_capacity,
            party_packages, party_enquiry_url
     FROM venues
     WHERE is_active = TRUE
       AND editor_locked = FALSE
       AND website IS NOT NULL
       AND website != ''
       AND website ILIKE 'http%'
       AND name NOT ILIKE 'OSM %'
       AND (party_source IS DISTINCT FROM 'grok_party_extract')
       AND (
         (party_capable = TRUE AND (
           party_price_from IS NULL
           OR party_max_capacity IS NULL
           OR description IS NULL
           OR opening_hours IS NULL
         ))
         OR (
           (party_capable IS NULL OR party_capable = FALSE)
           AND type IN ('softplay', 'community_hall', 'leisure_centre')
         )
       )
     ORDER BY
       CASE WHEN party_capable = TRUE THEN 0 ELSE 1 END,
       CASE WHEN party_capable IS NULL THEN 0 ELSE 1 END,
       CASE type
         WHEN 'softplay' THEN 1
         WHEN 'community_hall' THEN 2
         WHEN 'leisure_centre' THEN 3
         WHEN 'library' THEN 4
         ELSE 5
       END,
       id ASC
     LIMIT $1`,
    [batchSize],
  );

  const venues = rows as VenueRow[];
  if (venues.length === 0) {
    logger.info('No party-capable venues need Grok enrichment.');
    return result;
  }

  logger.info({ count: venues.length, allowWebSearch, dryRun }, 'Starting Grok party enrichment batch');

  for (const venue of venues) {
    result.totalProcessed++;

    if (!isCrawlable(venue.website)) {
      result.skipped++;
      continue;
    }

    try {
      await crawlDelay(600);
      const { text, matchedUrl } = await crawlVenueText(venue.website);

      let prompt: string;
      let useWebSearch = false;

      if (text.length >= 250) {
        prompt = [
          `Extract verified kids birthday party & venue facts for "${venue.name}" (${venue.type}, ${venue.borough || 'London'} ${venue.postcode || ''}).`,
          `Primary website: ${venue.website}`,
          `Matched page: ${matchedUrl}`,
          `Website text:`,
          text,
        ].join('\n\n');
      } else if (allowWebSearch) {
        useWebSearch = true;
        prompt = [
          `Find verified kids birthday party & venue facts for "${venue.name}" (${venue.borough || 'London'} ${venue.postcode || ''}).`,
          `Official website: ${venue.website}`,
          `Search only their official website or verified UK venue listings, and set source_url to the exact URL you verified.`,
        ].join('\n');
      } else {
        logger.info({ venueId: venue.id, name: venue.name }, 'Skipped (insufficient crawled text and --web-search disabled)');
        result.skipped++;
        continue;
      }

      const { data, costUsd } =
        cli === 'agy'
          ? await callAgyExtractor(prompt)
          : await callGrokExtractor(prompt, useWebSearch);
      result.totalCostUsd += costUsd;

      if (useWebSearch && !data.source_url) {
        logger.warn({ venueId: venue.id, name: venue.name }, 'Discarded web-search extraction without source_url');
        result.skipped++;
        continue;
      }

      logger.info(
        {
          venueId: venue.id,
          name: venue.name,
          price: data.party_price_from,
          unit: data.party_price_unit,
          cap: data.party_max_capacity,
          packages: data.party_packages.length,
          hasDesc: !!data.description,
          hasHours: !!data.opening_hours,
          costUsd: Number(costUsd.toFixed(4)),
        },
        'Grok extracted venue data',
      );

      if (!dryRun) {
        const pkgJson = data.party_packages.length > 0 ? JSON.stringify(data.party_packages) : null;
        await db.query(
          `UPDATE venues SET
             party_capable      = CASE WHEN party_capable IS TRUE THEN TRUE ELSE COALESCE($15, party_capable) END,
             venue_scope        = CASE WHEN $15 IS TRUE THEN 'core' ELSE venue_scope END,
             party_price_from   = COALESCE(party_price_from, $1),
             party_price_unit   = COALESCE(party_price_unit, $2),
             party_max_capacity = COALESCE(party_max_capacity, $3),
             party_packages     = COALESCE(NULLIF(party_packages, '[]'::jsonb), $4::jsonb),
             party_enquiry_url  = COALESCE(NULLIF(party_enquiry_url, ''), $5),
             booking_url        = COALESCE(NULLIF(booking_url, ''), $5),
             byo_food_allowed   = COALESCE(byo_food_allowed, $6),
             food_provided      = COALESCE(food_provided, $7),
             kitchen_facilities = COALESCE(kitchen_facilities, $8),
             catering_notes     = COALESCE(NULLIF(catering_notes, ''), $9),
             description        = COALESCE(NULLIF(description, ''), $10),
             opening_hours      = COALESCE(NULLIF(opening_hours, ''), $11),
             phone              = COALESCE(NULLIF(phone, ''), $12),
             email              = COALESCE(NULLIF(email, ''), $13),
             party_source       = 'grok_party_extract',
             party_extracted_at = NOW(),
             updated_at         = NOW()
           WHERE id = $14 AND editor_locked = FALSE`,
          [
            data.party_price_from,
            data.party_price_unit,
            data.party_max_capacity,
            pkgJson,
            data.party_enquiry_url,
            data.byo_food_allowed,
            data.food_provided,
            data.kitchen_facilities,
            data.catering_notes,
            data.description,
            data.opening_hours,
            data.phone,
            data.email,
            venue.id,
            data.party_capable,
          ],
        );

        const reason = `Verified from ${data.source_url || matchedUrl}`;
        await logProvenance(venue.id, 'party_price_from', venue.party_price_from, data.party_price_from?.toString() ?? null, reason);
        await logProvenance(venue.id, 'party_max_capacity', venue.party_max_capacity?.toString() ?? null, data.party_max_capacity?.toString() ?? null, reason);
        await logProvenance(venue.id, 'description', venue.description, data.description, reason);
        await logProvenance(venue.id, 'opening_hours', venue.opening_hours, data.opening_hours, reason);
      }

      result.enriched++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ venueId: venue.id, name: venue.name, err: msg }, 'Grok enrichment failed');
      result.failed++;
      if (/usage limit|rate limit|429/i.test(msg)) {
        logger.warn('Grok usage/rate limit reached — stopping batch early.');
        break;
      }
    }
  }

  logger.info(
    {
      ...result,
      totalCostUsd: Number(result.totalCostUsd.toFixed(4)),
    },
    'Grok enrichment batch complete',
  );
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const batchArg = args.find((a) => /^\d+$/.test(a));
  const batchSize = batchArg ? Number.parseInt(batchArg, 10) : 5;
  const allowWebSearch = args.includes('--web-search');
  const dryRun = args.includes('--dry-run');
  const cli: 'grok' | 'agy' =
    args.includes('--agy') || args.includes('--cli=agy') || process.env.ENRICH_CLI === 'agy'
      ? 'agy'
      : 'grok';

  enrichWithGrok(batchSize, { allowWebSearch, dryRun, cli })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
