/**
 * Phase 23 AI Evaluation Benchmark script for Party Extraction.
 * Runs evaluation suite against backend/evals/party_extraction_evals.jsonl
 * to score extraction accuracy, precision, recall, and schema validity.
 */

import * as fs from 'fs';
import * as path from 'path';
import { scanPartyHtml } from '../src/utils/partyExtraction.js';

interface EvalItem {
  id: string;
  venue_name: string;
  url: string;
  raw_html: string;
  expected: {
    party_capable: boolean;
    party_price_from: number | null;
    party_price_unit: string | null;
    party_max_capacity: number | null;
    party_enquiry_url: string | null;
  };
}

async function runEvaluation() {
  const evalsPath = path.join(process.cwd(), 'evals', 'party_extraction_evals.jsonl');
  if (!fs.existsSync(evalsPath)) {
    console.error(`Evals file not found at ${evalsPath}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(evalsPath, 'utf-8').trim().split('\n').filter(Boolean);
  const items: EvalItem[] = lines.map((l) => JSON.parse(l));

  console.log(`\n======================================================`);
  console.log(` 🤖 AI EVALUATION BENCHMARK — PARTY DATA EXTRACTION `);
  console.log(` Total Test Cases: ${items.length}`);
  console.log(`======================================================\n`);

  let capableMatches = 0;
  let priceMatches = 0;
  let capacityMatches = 0;
  let enquiryUrlMatches = 0;
  let totalEvaluated = items.length;

  items.forEach((item, idx) => {
    const scan = scanPartyHtml(item.raw_html, item.url);
    const predictedCapable = scan.hasPartySignal;
    const isCapableMatch = predictedCapable === item.expected.party_capable;
    if (isCapableMatch) capableMatches++;

    const isPriceMatch =
      item.expected.party_price_from === null
        ? scan.priceFrom === null
        : scan.priceFrom !== null && Math.abs(scan.priceFrom - item.expected.party_price_from) < 1.0;
    if (isPriceMatch) priceMatches++;

    const isCapMatch =
      item.expected.party_max_capacity === null
        ? scan.maxCapacity === null
        : scan.maxCapacity === item.expected.party_max_capacity;
    if (isCapMatch) capacityMatches++;

    const isUrlMatch =
      item.expected.party_enquiry_url === null
        ? scan.enquiryUrl === null
        : Boolean(scan.enquiryUrl);
    if (isUrlMatch) enquiryUrlMatches++;

    const statusIcon = isCapableMatch && isPriceMatch && isCapMatch ? '✅' : '⚠️';
    console.log(
      `${statusIcon} [${item.id}] ${item.venue_name.padEnd(32)} | Capable: ${predictedCapable ? 'YES' : 'NO '} (exp: ${item.expected.party_capable ? 'YES' : 'NO '}) | Price: £${scan.priceFrom ?? '—'} (exp: £${item.expected.party_price_from ?? '—'}) | Cap: ${scan.maxCapacity ?? '—'}`
    );
  });

  const capableAccuracy = ((capableMatches / totalEvaluated) * 100).toFixed(1);
  const priceAccuracy = ((priceMatches / totalEvaluated) * 100).toFixed(1);
  const capacityAccuracy = ((capacityMatches / totalEvaluated) * 100).toFixed(1);
  const enquiryAccuracy = ((enquiryUrlMatches / totalEvaluated) * 100).toFixed(1);
  const overallAccuracy = (
    ((capableMatches + priceMatches + capacityMatches + enquiryUrlMatches) /
      (totalEvaluated * 4)) *
    100
  ).toFixed(1);

  console.log(`\n------------------------------------------------------`);
  console.log(` EVALUATION RESULTS & METRICS `);
  console.log(`------------------------------------------------------`);
  console.log(` • Party Capability Accuracy:  ${capableAccuracy}% (${capableMatches}/${totalEvaluated})`);
  console.log(` • Price Extraction Precision: ${priceAccuracy}% (${priceMatches}/${totalEvaluated})`);
  console.log(` • Capacity Precision:         ${capacityAccuracy}% (${capacityMatches}/${totalEvaluated})`);
  console.log(` • Enquiry Link Discovery:     ${enquiryAccuracy}% (${enquiryUrlMatches}/${totalEvaluated})`);
  console.log(` ----------------------------------------------------`);
  console.log(` OVERALL BENCHMARK ACCURACY:   ${overallAccuracy}%`);
  console.log(`======================================================\n`);
}

runEvaluation().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
