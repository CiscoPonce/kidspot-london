#!/usr/bin/env npx tsx
/**
 * Smoke-test borough CSV feed URLs and report column/contact coverage.
 *
 * Usage:
 *   npx tsx scripts/maintenance/audit-borough-csv-feeds.ts
 *   npx tsx scripts/maintenance/audit-borough-csv-feeds.ts --source-id 1
 *   npx tsx scripts/maintenance/audit-borough-csv-feeds.ts --extra-only
 *
 * Requires DATABASE_URL for registry rows (optional with --extra-only).
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from '../../src/clients/db.js';
import { boroughCsvService } from '../../src/services/boroughCsvService.js';
import type { BoroughCsvColumnReport, BoroughCsvSource } from '../../src/types/venue.js';

dotenv.config();

/** Verified / candidate feeds beyond borough_csv_sources seed rows. */
const EXTRA_CANDIDATE_FEEDS: Array<{
  borough_name: string;
  dataset_name: string;
  dataset_url: string;
  dataset_type: string;
  notes?: string;
}> = [
  {
    borough_name: 'Greater London',
    dataset_name: 'Community Centres (CIM 2019)',
    dataset_url:
      'https://data.london.gov.uk/download/2ko88/a8625bba-addb-4fae-a737-244b2281f429/2019%20publication%20-%20Community_centres%20%28Nov%202023%29.csv',
    dataset_type: 'community_halls',
    notes: 'London Datastore Cultural Infrastructure Map — name, address, lat/lon',
  },
  {
    borough_name: 'Greater London',
    dataset_name: 'Arts Centres (CIM 2019)',
    dataset_url:
      'https://data.london.gov.uk/download/2ko88/bec79216-7a51-4810-89d5-da8cc44d8458/Arts_centres.csv',
    dataset_type: 'leisure_centres',
    notes: 'May include multi-use venues with hire pages',
  },
];

interface FeedAuditResult {
  borough_name: string;
  dataset_name: string;
  dataset_url: string;
  dataset_type: string;
  source: 'db' | 'candidate';
  http_status: number | null;
  content_type: string | null;
  ok: boolean;
  error?: string;
  bytes: number;
  coverage: BoroughCsvColumnReport | null;
  sample_names: string[];
  notes?: string;
}

async function probeUrl(url: string): Promise<{
  status: number;
  contentType: string | null;
  body: string;
}> {
  const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  let status = head.status;
  let contentType = head.headers.get('content-type');

  if (status === 405 || status === 403) {
    const get = await fetch(url, { redirect: 'follow' });
    status = get.status;
    contentType = get.headers.get('content-type');
    const body = await get.text();
    return { status, contentType, body };
  }

  if (status >= 400) {
    const get = await fetch(url, { redirect: 'follow' });
    status = get.status;
    contentType = get.headers.get('content-type');
    const body = await get.text();
    return { status, contentType, body };
  }

  const get = await fetch(url, { redirect: 'follow' });
  const body = await get.text();
  return { status: get.status, contentType: get.headers.get('content-type'), body };
}

async function auditFeed(input: {
  borough_name: string;
  dataset_name: string;
  dataset_url: string;
  dataset_type: string;
  source: 'db' | 'candidate';
  notes?: string;
}): Promise<FeedAuditResult> {
  const base: FeedAuditResult = {
    borough_name: input.borough_name,
    dataset_name: input.dataset_name,
    dataset_url: input.dataset_url,
    dataset_type: input.dataset_type,
    source: input.source,
    http_status: null,
    content_type: null,
    ok: false,
    bytes: 0,
    coverage: null,
    sample_names: [],
    notes: input.notes,
  };

  try {
    const { status, contentType, body } = await probeUrl(input.dataset_url);
    base.http_status = status;
    base.content_type = contentType;
    base.bytes = body.length;

    if (status < 200 || status >= 400) {
      base.error = `HTTP ${status}`;
      return base;
    }

    const looksCsv =
      (contentType && /csv|text\/plain/i.test(contentType)) ||
      input.dataset_url.toLowerCase().includes('.csv') ||
      body.includes(',');
    if (!looksCsv) {
      base.error = 'Response does not look like CSV';
      return base;
    }

    const headers = boroughCsvService.parseHeaders(body);
    const records = boroughCsvService.parseCsv(body);
    base.coverage = boroughCsvService.reportColumnCoverage(records, headers);
    base.sample_names = records.slice(0, 3).map((r) => r.name);
    base.ok = base.coverage.row_count > 0 && base.coverage.with_name > 0;
    return base;
  } catch (err: unknown) {
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((100 * n) / total)}%`;
}

function printReport(results: FeedAuditResult[]): void {
  console.log('\n=== Borough CSV feed audit ===\n');

  for (const r of results) {
    const tag = r.ok ? 'OK' : 'FAIL';
    console.log(`[${tag}] ${r.borough_name} — ${r.dataset_name} (${r.source})`);
    console.log(`  URL: ${r.dataset_url}`);
    if (r.notes) console.log(`  Note: ${r.notes}`);
    console.log(`  HTTP: ${r.http_status ?? '?'}  type: ${r.content_type ?? '?'}  bytes: ${r.bytes}`);
    if (r.error) console.log(`  Error: ${r.error}`);
    if (r.coverage) {
      const c = r.coverage;
      console.log(`  Rows: ${c.row_count}`);
      console.log(
        `  Location: postcode ${pct(c.with_postcode, c.row_count)}, coords ${pct(c.with_coords, c.row_count)}`,
      );
      console.log(
        `  Contact: phone ${pct(c.with_phone, c.row_count)}, email ${pct(c.with_email, c.row_count)}, ` +
          `website ${pct(c.with_website, c.row_count)}, booking ${pct(c.with_booking_url, c.row_count)}, ` +
          `any ${pct(c.with_any_contact, c.row_count)}`,
      );
      if (c.contact_header_matches.length) {
        console.log(`  Contact-like headers: ${c.contact_header_matches.join(', ')}`);
      } else {
        console.log('  Contact-like headers: (none detected — hire contacts may need Tier-2 crawl)');
      }
      if (r.sample_names.length) {
        console.log(`  Samples: ${r.sample_names.join(' | ')}`);
      }
    }
    console.log('');
  }

  const ok = results.filter((r) => r.ok).length;
  const withContact = results.filter((r) => r.coverage && r.coverage.with_any_contact > 0).length;
  console.log(`Summary: ${ok}/${results.length} feeds parseable, ${withContact}/${results.length} have any contact column filled`);
}

async function loadDbSources(sourceId?: number): Promise<BoroughCsvSource[]> {
  if (sourceId) {
    const row = await boroughCsvService.getSource(sourceId);
    return row ? [row] : [];
  }
  return boroughCsvService.getActiveSources();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const extraOnly = args.includes('--extra-only');
  const sourceIdArg = args.find((a) => a.startsWith('--source-id='));
  const sourceId = sourceIdArg ? parseInt(sourceIdArg.split('=')[1], 10) : undefined;

  const results: FeedAuditResult[] = [];

  if (!extraOnly) {
    try {
      const sources = await loadDbSources(sourceId);
      for (const s of sources) {
        results.push(
          await auditFeed({
            borough_name: s.borough_name,
            dataset_name: s.dataset_name,
            dataset_url: s.dataset_url,
            dataset_type: s.dataset_type,
            source: 'db',
          }),
        );
      }
    } catch (err) {
      console.warn('DATABASE_URL unavailable — skipping DB registry:', err);
    }
  }

  for (const feed of EXTRA_CANDIDATE_FEEDS) {
    if (sourceId) continue;
    const duplicate = results.some((r) => r.dataset_url === feed.dataset_url);
    if (!duplicate) {
      results.push(await auditFeed({ ...feed, source: 'candidate' }));
    }
  }

  printReport(results);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
