import * as cheerio from 'cheerio';
import { db } from '../../../src/clients/db.js';
import { logger } from '../../../src/config/logger.js';
import { normalizeUkPhone, isValidUkPhone } from '../../../src/utils/phone.js';
import { browserHeaders } from '../../../src/utils/httpHeaders.js';
import { crawlDelay } from '../../../src/utils/rateLimiter.js';
import { callNvidia } from '../../../src/utils/nvidia.js';

export interface DirectCrawlResult {
  enriched: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
}

const PHONE_REGEX = /(?:(?:\+44\s?|0)(?:\d[\s.-]?){9,12})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JUNK_EMAIL = /example\.com|sentry\.io|wixpress|wordpress|\.png$|\.jpg$|\.webp$/i;

const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us', '/get-in-touch'];

// NOTE: the timeout signal is created PER request inside fetchPage. A shared
// module-level AbortSignal.timeout() aborts every fetch after 12s of wall-clock
// from import, silently nulling all subsequent crawls in a long batch.
const FETCH_OPTS = {
  redirect: 'follow' as const,
};

export function normalizeUrl(base: string, path: string): string {
  try {
    if (!path || path === '') return base;
    return new URL(path, base).href;
  } catch {
    return base;
  }
}

export function isCrawlable(url: string): boolean {
  if (!url || url.includes('openstreetmap.org') || url.includes('facebook.com') ||
      url.includes('instagram.com') || url.startsWith('mailto:')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function extractFromHtml(html: string): { phone: string | null; email: string | null; openingHours: string | null } {
  const $ = cheerio.load(html);
  let phone: string | null = null;
  let email: string | null = null;
  let openingHours: string | null = null;

  // mailto: and tel: links
  $('a[href^="mailto:"]').each((_, el) => {
    if (email) return;
    const href = $(el).attr('href') || '';
    const em = href.replace('mailto:', '').split('?')[0].trim();
    if (em && !JUNK_EMAIL.test(em)) email = em;
  });

  $('a[href^="tel:"]').each((_, el) => {
    if (phone) return;
    const href = $(el).attr('href') || '';
    phone = href.replace('tel:', '').replace(/\s/g, '').trim();
  });

  // Regex fallback on visible text + HTML
  if (!phone) {
    const phones = html.match(PHONE_REGEX);
    if (phones?.[0]) phone = phones[0].replace(/[\s.-]/g, '').trim();
  }

  if (!email) {
    const emails = html.match(EMAIL_REGEX);
    const valid = emails?.find((e) => !JUNK_EMAIL.test(e));
    if (valid) email = valid;
  }

  // Schema.org JSON-LD opening hours
  $('script[type="application/ld+json"]').each((_, el) => {
    if (openingHours) return;
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const spec = item.openingHoursSpecification || item.openingHours;
        if (spec) {
          openingHours = typeof spec === 'string' ? spec : JSON.stringify(spec);
          break;
        }
      }
    } catch { /* ignore malformed JSON-LD */ }
  });

  // Microdata / itemprop openingHours
  if (!openingHours) {
    const oh = $('[itemprop="openingHours"]').attr('content') || $('[itemprop="openingHours"]').text().trim();
    if (oh) openingHours = oh;
  }

  return { phone, email, openingHours };
}

export async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { ...FETCH_OPTS, headers: browserHeaders(), signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Direct Website Crawl (Layer 2b)
 * Crawls known website URLs — no search engine needed.
 */
export async function enrichViaDirectCrawl(batchSize: number = 100): Promise<DirectCrawlResult> {
  const result: DirectCrawlResult = { enriched: 0, skipped: 0, failed: 0, totalProcessed: 0 };

  const { rows: venues } = await db.query(
    `SELECT id, name, type, website, phone, email, opening_hours
     FROM venues
     WHERE is_active = TRUE
       AND website IS NOT NULL AND website != ''
       AND website NOT ILIKE '%openstreetmap.org%'
       AND website NOT ILIKE '%facebook.com%'
       AND (
         (phone IS NULL OR phone = '')
         OR (email IS NULL OR email = '')
         OR (opening_hours IS NULL OR opening_hours = '')
       )
       AND (website_crawl_enriched_at IS NULL OR website_crawl_enriched_at < NOW() - INTERVAL '30 days')
     ORDER BY
       CASE type
         WHEN 'softplay' THEN 1
         WHEN 'leisure_centre' THEN 2
         WHEN 'community_hall' THEN 3
         WHEN 'museum' THEN 4
         WHEN 'library' THEN 5
         ELSE 6
       END,
       id ASC
     LIMIT $1`,
    [batchSize]
  );

  if (venues.length === 0) {
    logger.info('No venues require direct website crawl.');
    return result;
  }

  logger.info(`Direct crawl: ${venues.length} venues with websites to process.`);

  for (const venue of venues) {
    result.totalProcessed++;

    if (!isCrawlable(venue.website)) {
      await db.query(`UPDATE venues SET website_crawl_enriched_at = NOW() WHERE id = $1`, [venue.id]);
      result.skipped++;
      continue;
    }

  try {
    await crawlDelay(800);

    let phone = venue.phone || null;
    let email = venue.email || null;
    let openingHours = venue.opening_hours || null;

    // Track the first fetched HTML for LLM fallback (total-failure gate)
    let firstFetchedHtml: string | null = null;

    for (const path of CONTACT_PATHS) {
      if (phone && email && openingHours) break;
      const url = normalizeUrl(venue.website, path);
      const html = await fetchPage(url);
      if (!html) continue;
      if (!firstFetchedHtml) firstFetchedHtml = html;
      const extracted = extractFromHtml(html);
      if (!phone && extracted.phone) phone = extracted.phone;
      if (!email && extracted.email) email = extracted.email;
      if (!openingHours && extracted.openingHours) openingHours = extracted.openingHours;
    }

    const htmlFetched = firstFetchedHtml !== null;

  // CE-02: LLM fallback ONLY when ALL THREE fields are null AND we have HTML to work with
  // Gate: phone IS NULL AND email IS NULL AND opening_hours IS NULL after cheerio+regex extraction
  // (Same semantics in TS: !phone && !email && !openingHours)
  // One call per venue per pass. Result validated before any DB write.
  let llmFired = false;
  if (!phone && !email && !openingHours && htmlFetched) {
  try {
  const htmlForLlm = firstFetchedHtml!; // non-null: htmlFetched=true guarantees firstFetchedHtml set
  const llmRaw = await callNvidia({
    systemPrompt:
      'You are a contact-data extraction assistant. Given raw HTML from a UK venue website, extract UK phone numbers, email addresses, and opening hours. Return ONLY a JSON object with keys: phone (string|null), email (string|null), opening_hours (string|null). Use null for missing fields. Do not invent data.',
    userPrompt:
      `Extract contact details from this HTML for the venue "${venue.name}" (${venue.website}):\n\n` +
      // Trim to stay within token budget — keep first ~12000 chars
      htmlForLlm.slice(0, 12000),
  });

        let llmPhone: string | null = null;
        let llmEmail: string | null = null;
        let llmOpeningHours: string | null = null;

        try {
          // LLM may wrap JSON in prose; extract the first {...} block.
          const jsonMatch = llmRaw.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : llmRaw);
          llmPhone = typeof parsed.phone === 'string' ? parsed.phone : null;
          llmEmail = typeof parsed.email === 'string' ? parsed.email : null;
          llmOpeningHours = typeof parsed.opening_hours === 'string' ? parsed.opening_hours : null;
        } catch {
          // LLM returned non-JSON — discard
        }

        // Validate before assignment (T-18B-01 mitigation)
        if (llmPhone && isValidUkPhone(llmPhone)) {
          const normalized = normalizeUkPhone(llmPhone);
          if (normalized) llmPhone = normalized;
        } else if (llmPhone) {
          llmPhone = null; // failed UK validation
        }

        if (llmEmail && EMAIL_REGEX.test(llmEmail) && !JUNK_EMAIL.test(llmEmail)) {
          // keep
        } else {
          llmEmail = null;
        }

        if (!llmPhone && !llmEmail && !llmOpeningHours) {
          // LLM yielded nothing useful — log metric and leave fields null
          logger.info({ venueId: venue.id, name: venue.name }, 'LLM fallback: no valid fields extracted');
        } else {
          phone = phone ?? llmPhone;
          email = email ?? llmEmail;
          openingHours = openingHours ?? llmOpeningHours;
          llmFired = true;
          logger.info(
            { venueId: venue.id, name: venue.name, ph: !!phone, em: !!email, hrs: !!openingHours },
            'LLM fallback extracted contact fields',
          );
        }
      } catch (llmErr: any) {
        logger.warn(
          { err: llmErr.message, venueId: venue.id, name: venue.name },
          'LLM fallback call failed — proceeding without LLM data',
        );
      }
    }

    const hasNew = (
        (phone && phone !== venue.phone) ||
        (email && email !== venue.email) ||
        (openingHours && openingHours !== venue.opening_hours)
      );

      await db.query(
        `UPDATE venues SET
           phone = COALESCE(NULLIF($1, ''), phone),
           email = COALESCE(NULLIF($2, ''), email),
           opening_hours = COALESCE(NULLIF($3, ''), opening_hours),
           website_crawl_enriched_at = NOW(),
           contact_enriched_at = COALESCE(contact_enriched_at, NOW())
         WHERE id = $4`,
        [phone, email, openingHours, venue.id]
      );

      if (hasNew) {
        logger.info(`  ✓ ${venue.name}: ph=${!!phone && phone !== venue.phone} em=${!!email && email !== venue.email} hrs=${!!openingHours && openingHours !== venue.opening_hours}`);
        result.enriched++;
      } else {
        result.skipped++;
      }
    } catch (err: any) {
      logger.error({ err, venueId: venue.id, name: venue.name }, 'Direct crawl failed');
      await db.query(`UPDATE venues SET website_crawl_enriched_at = NOW() WHERE id = $1`, [venue.id]);
      result.failed++;
    }
  }

  logger.info(result, 'Direct crawl batch completed.');
  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  enrichViaDirectCrawl(20)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
