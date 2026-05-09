#!/usr/bin/env node
/**
 * Phase 12 — coverage evaluation harness.
 *
 * Reads a stratified postcode panel and, for each row, exercises the live API
 * against the configured `radius_miles` and the canonical user chips
 * (soft_play, party_room, etc.). A panel postcode "passes" when at least one
 * chip returns >= 1 venue, mirroring the §11 Phase 12 plan.
 *
 * Output:
 *   1. Stdout: one line per postcode + summary by stratum.
 *   2. JSON:   .planning/phases/12-party-portal-reliability/baselines/<date>.json
 *
 * No DB writes. Safe to run repeatedly.
 *
 *   tsx backend/scripts/coverage-eval.ts \
 *     --panel .planning/phases/12-party-portal-reliability/fixtures/evaluation-postcodes-v1.csv \
 *     --api http://localhost:4000 \
 *     --radius 5 \
 *     --out .planning/phases/12-party-portal-reliability/baselines/$(date +%F).json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface PanelRow {
  postcode: string;
  expected_lat: number;
  expected_lon: number;
  stratum: string;
  notes?: string;
}

interface CoverageResult {
  postcode: string;
  stratum: string;
  passed: boolean;
  by_chip: Record<string, number>;
  closest_match?: { name: string; distance_miles: number; facets: string[] };
}

const CHIPS: Array<{ label: string; type: string }> = [
  { label: 'soft_play', type: 'softplay' },
  { label: 'party_room', type: 'community_hall' }, // server still uses legacy `type`
  { label: 'museum', type: 'museum' },
  { label: 'park', type: 'park' },
  { label: 'all', type: '' },
];

function parseArgs(): { panel: string; api: string; radius: number; out: string | null } {
  const args = process.argv.slice(2);
  const get = (k: string, d?: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : d;
  };
  return {
    panel: get('panel', '.planning/phases/12-party-portal-reliability/fixtures/evaluation-postcodes-v1.csv')!,
    api: get('api', 'http://localhost:4000')!,
    radius: Number(get('radius', '5')),
    out: get('out') ?? null,
  };
}

function parsePanel(path: string): PanelRow[] {
  const raw = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = raw[0].split(',').map(s => s.trim());
  const idx = (k: string) => header.indexOf(k);
  return raw.slice(1).map(line => {
    const cols = line.split(',').map(s => s.trim());
    return {
      postcode: cols[idx('postcode')],
      expected_lat: Number(cols[idx('expected_lat')]),
      expected_lon: Number(cols[idx('expected_lon')]),
      stratum: cols[idx('stratum')],
      notes: cols[idx('notes')] || undefined,
    };
  });
}

async function searchOnce(api: string, lat: number, lon: number, radius: number, type: string): Promise<any> {
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
    limit: '24',
  });
  if (type) qs.set('type', type);
  const res = await fetch(`${api}/api/search/venues?${qs.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main(): Promise<void> {
  const { panel, api, radius, out } = parseArgs();
  const rows = parsePanel(panel);
  console.log(`Coverage panel: ${rows.length} postcodes, radius ${radius} mi, api ${api}`);
  console.log('---');

  const results: CoverageResult[] = [];
  for (const row of rows) {
    const byChip: Record<string, number> = {};
    let closest: CoverageResult['closest_match'] | undefined;
    for (const chip of CHIPS) {
      try {
        const data = await searchOnce(api, row.expected_lat, row.expected_lon, radius, chip.type);
        const venues = data?.data?.regular?.venues ?? [];
        byChip[chip.label] = venues.length;
        if (chip.label === 'soft_play' && venues.length > 0) {
          const sorted = [...venues].sort((a: any, b: any) => (a.distance_miles ?? 9) - (b.distance_miles ?? 9));
          closest = {
            name: sorted[0].name,
            distance_miles: sorted[0].distance_miles ?? 0,
            facets: sorted[0].parent_facets ?? sorted[0].facets ?? [],
          };
        }
      } catch (err) {
        byChip[chip.label] = -1;
      }
    }
    const passed = (byChip['soft_play'] ?? 0) > 0 || (byChip['party_room'] ?? 0) > 0;
    const r: CoverageResult = {
      postcode: row.postcode,
      stratum: row.stratum,
      passed,
      by_chip: byChip,
      closest_match: closest,
    };
    results.push(r);
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(
      `${tag.padEnd(4)} ${row.postcode.padEnd(8)} [${row.stratum.padEnd(20)}] ` +
        `soft_play=${byChip.soft_play} party_room=${byChip.party_room} all=${byChip.all}` +
        (closest ? ` -> ${closest.name} (${closest.distance_miles.toFixed(2)} mi)` : '')
    );
  }

  const byStratum: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    if (!byStratum[r.stratum]) byStratum[r.stratum] = { total: 0, passed: 0 };
    byStratum[r.stratum].total += 1;
    if (r.passed) byStratum[r.stratum].passed += 1;
  }
  const overall = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    by_stratum: byStratum,
  };
  console.log('---');
  console.log(`Overall: ${overall.passed}/${overall.total} (${Math.round(100 * overall.passed / overall.total)}%)`);
  for (const [k, v] of Object.entries(byStratum)) {
    console.log(`  ${k.padEnd(28)} ${v.passed}/${v.total}`);
  }

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          panel,
          api,
          radius_miles: radius,
          overall,
          results,
        },
        null,
        2
      )
    );
    console.log(`\nWrote baseline: ${out}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
