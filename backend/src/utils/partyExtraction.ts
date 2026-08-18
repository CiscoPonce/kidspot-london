/**
 * Phase 18D: Party data extraction.
 *
 * Mines children's-party booking data (capability, price-per-child, capacity,
 * package names, enquiry/booking link) from crawled venue HTML.
 *
 * Cost discipline: a cheap cheerio/regex pre-pass runs first; the NVIDIA LLM
 * (shared 18B non-streaming client) is only used as a fallback when the regex
 * pass can't confidently decide capability + structured fields.
 *
 * Every value is validated (price 1-1000, capacity 1-1000, http(s) enquiry URL)
 * before it is returned, so nothing hallucinated or out-of-range is persisted.
 */

import * as cheerio from 'cheerio';
import { callNvidia } from './nvidia.js';

export type PartyPriceUnit = 'per_child' | 'per_hour' | 'flat';

export interface PartyData {
  partyCapable: boolean | null;
  priceFrom: number | null;
  priceUnit: PartyPriceUnit | null;
  maxCapacity: number | null;
  packages: string[];
  enquiryUrl: string | null;
  byoFoodAllowed?: boolean | null;
  foodProvided?: boolean | null;
  kitchenFacilities?: boolean | null;
  cateringNotes?: string | null;
  source: 'regex' | 'llm' | null;
}

export interface PartyScan {
  hasPartySignal: boolean;
  priceFrom: number | null;
  priceUnit: PartyPriceUnit | null;
  maxCapacity: number | null;
  packages: string[];
  enquiryUrl: string | null;
  byoFoodAllowed?: boolean | null;
  foodProvided?: boolean | null;
  kitchenFacilities?: boolean | null;
}

const EMPTY: PartyData = {
  partyCapable: null,
  priceFrom: null,
  priceUnit: null,
  maxCapacity: null,
  packages: [],
  enquiryUrl: null,
  byoFoodAllowed: null,
  foodProvided: null,
  kitchenFacilities: null,
  cateringNotes: null,
  source: null,
};

const PARTY_KEYWORDS =
  /\b(birthday\s+part(?:y|ies)|party\s+package|kids?'?\s+part(?:y|ies)|children'?s?\s+part(?:y|ies)|party\s+room|party\s+hire|book\s+a\s+party|party\s+booking)/i;

const PARTY_LINK_KEYWORDS = /part(?:y|ies)|birthday|celebrat/i;

const BYO_FOOD_KEYWORDS =
  /\b(bring your own food|byo food|self[- ]cater(?:ing|ed)?|external cater(?:ing|ers)|bring your own catering|own food permitted|bring your own snacks|external food allowed)\b/i;

const FOOD_PROVIDED_KEYWORDS =
  /\b(hot food included|cold buffet|pizza and nuggets|party meal boxes?|unlimited squash|party food included|food and drink included|party menu|catered party)\b/i;

const KITCHEN_KEYWORDS =
  /\b(kitchen access|fully equipped kitchen|microwave|fridge|freezer|tea and coffee|hot water urn|kettle|servery|kitchen hire)\b/i;

const PRICE_PER_CHILD =
  /(?:from\s*)?£\s*(\d{1,4}(?:\.\d{1,2})?)\s*(?:\+?\s*vat\s*)?(?:per\s*|\/\s*|pp\b|p\.?p\.?\b)?\s*(?:child|kid|children|head|guest|person)/i;
const PRICE_PER_HOUR =
  /(?:from\s*)?£\s*(\d{1,4}(?:\.\d{1,2})?)\s*(?:per\s*|\/\s*)?(?:hour|hr)\b/i;
const CAPACITY =
  /(?:up\s*to|max(?:imum)?(?:\s*of)?|accommodate[sd]?(?:\s*up\s*to)?|for\s*up\s*to)\s*(\d{1,3})\s*(?:children|kids|guests|people|persons|child)/i;

function toAbsoluteUrl(href: string, base?: string): string | null {
  try {
    if (!href) return null;
    const trimmed = href.trim();
    if (
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('javascript:')
    ) {
      return null;
    }
    const u = base ? new URL(trimmed, base) : new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Cheap regex/cheerio pre-pass. Pure, network-free — unit-testable.
 */
export function scanPartyHtml(html: string, baseUrl?: string): PartyScan {
  const scan: PartyScan = {
    hasPartySignal: false,
    priceFrom: null,
    priceUnit: null,
    maxCapacity: null,
    packages: [],
    enquiryUrl: null,
  };
  if (!html) return scan;

  const $ = cheerio.load(html);

  // Find a party/birthday link before stripping markup.
  $('a[href]').each((_, el) => {
    if (scan.enquiryUrl) return;
    const href = $(el).attr('href') || '';
    const label = ($(el).text() || '').trim();
    if (PARTY_LINK_KEYWORDS.test(href) || PARTY_LINK_KEYWORDS.test(label)) {
      const abs = toAbsoluteUrl(href, baseUrl);
      if (abs) scan.enquiryUrl = abs;
    }
  });

  $('script, style, noscript, svg').remove();
  const rawText = $('body').length ? $('body').text() : $.root().text();
  const text = rawText.replace(/\s+/g, ' ').trim();

  scan.hasPartySignal = PARTY_KEYWORDS.test(text);

  // A real party price is never below ~£5/child; sub-£5 regex hits are almost
  // always noise (deposits, "£1 booking fee", truncated numbers). Drop them so
  // the case falls through to the LLM, which reads the figure in context.
  const REGEX_PRICE_FLOOR = 5;
  const pc = text.match(PRICE_PER_CHILD);
  if (pc && parseFloat(pc[1]) >= REGEX_PRICE_FLOOR) {
    scan.priceFrom = parseFloat(pc[1]);
    scan.priceUnit = 'per_child';
  } else {
    const ph = text.match(PRICE_PER_HOUR);
    if (ph && parseFloat(ph[1]) >= REGEX_PRICE_FLOOR) {
      scan.priceFrom = parseFloat(ph[1]);
      scan.priceUnit = 'per_hour';
    }
  }

  const cap = text.match(CAPACITY);
  if (cap) scan.maxCapacity = parseInt(cap[1], 10);

  if (BYO_FOOD_KEYWORDS.test(text)) scan.byoFoodAllowed = true;
  if (FOOD_PROVIDED_KEYWORDS.test(text)) scan.foodProvided = true;
  if (KITCHEN_KEYWORDS.test(text)) scan.kitchenFacilities = true;

  return scan;
}

/**
 * Parse the LLM's JSON answer (which may be wrapped in prose).
 */
export function parsePartyJson(raw: string): Partial<PartyData> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const j = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
    const num = (v: unknown): number | null =>
      typeof v === 'number'
        ? v
        : typeof v === 'string' && v.trim() !== ''
          ? Number.parseFloat(v)
          : null;
    return {
      partyCapable: typeof j.hosts_parties === 'boolean' ? j.hosts_parties : undefined,
      priceFrom: num(j.price_from),
      priceUnit:
        j.price_unit === 'per_child' || j.price_unit === 'per_hour' || j.price_unit === 'flat'
          ? (j.price_unit as PartyPriceUnit)
          : null,
      maxCapacity: num(j.max_capacity),
      packages: Array.isArray(j.packages) ? (j.packages as unknown[]).map(String) : [],
      enquiryUrl: typeof j.enquiry_url === 'string' ? j.enquiry_url : null,
      byoFoodAllowed: typeof j.byo_food_allowed === 'boolean' ? j.byo_food_allowed : undefined,
      foodProvided: typeof j.food_provided === 'boolean' ? j.food_provided : undefined,
      kitchenFacilities: typeof j.kitchen_facilities === 'boolean' ? j.kitchen_facilities : undefined,
      cateringNotes: typeof j.catering_notes === 'string' ? j.catering_notes : null,
    };
  } catch {
    return {};
  }
}

/**
 * Validate + clamp a candidate party record before it can be persisted.
 */
export function validatePartyData(d: Partial<PartyData>): PartyData {
  const out: PartyData = { ...EMPTY, source: d.source ?? null };

  out.partyCapable = typeof d.partyCapable === 'boolean' ? d.partyCapable : null;

  if (
    typeof d.priceFrom === 'number' &&
    Number.isFinite(d.priceFrom) &&
    d.priceFrom >= 1 &&
    d.priceFrom <= 1000
  ) {
    out.priceFrom = Math.round(d.priceFrom * 100) / 100;
  }

  if (d.priceUnit === 'per_child' || d.priceUnit === 'per_hour' || d.priceUnit === 'flat') {
    out.priceUnit = d.priceUnit;
  }
  // A price with no explicit unit defaults to per-child (the dominant party model).
  if (out.priceFrom !== null && out.priceUnit === null) out.priceUnit = 'per_child';

  if (
    typeof d.maxCapacity === 'number' &&
    Number.isInteger(d.maxCapacity) &&
    d.maxCapacity >= 1 &&
    d.maxCapacity <= 1000
  ) {
    out.maxCapacity = d.maxCapacity;
  }

  if (Array.isArray(d.packages)) {
    out.packages = [
      ...new Set(
        d.packages
          .filter((p): p is string => typeof p === 'string')
          .map((p) => p.trim())
          .filter((p) => p.length > 0 && p.length <= 120),
      ),
    ].slice(0, 12);
  }

  if (typeof d.enquiryUrl === 'string') {
    out.enquiryUrl = toAbsoluteUrl(d.enquiryUrl);
  }

  out.byoFoodAllowed = typeof d.byoFoodAllowed === 'boolean' ? d.byoFoodAllowed : null;
  out.foodProvided = typeof d.foodProvided === 'boolean' ? d.foodProvided : null;
  out.kitchenFacilities = typeof d.kitchenFacilities === 'boolean' ? d.kitchenFacilities : null;
  if (typeof d.cateringNotes === 'string' && d.cateringNotes.trim().length > 0) {
    out.cateringNotes = d.cateringNotes.trim().slice(0, 300);
  }

  return out;
}

export interface ExtractPartyOptions {
  name: string;
  website: string;
  html: string;
  signal?: AbortSignal;
}

/**
 * Extract validated party data from crawled HTML.
 * Regex pre-pass first; NVIDIA LLM fallback only when regex is inconclusive.
 */
export async function extractPartyData(opts: ExtractPartyOptions): Promise<PartyData> {
  const { name, website, html, signal } = opts;
  if (!html) return { ...EMPTY };

  const scan = scanPartyHtml(html, website);

  // Cheap path: a clear party signal plus at least one structured value.
  if (scan.hasPartySignal && (scan.priceFrom !== null || scan.maxCapacity !== null)) {
    return validatePartyData({
      partyCapable: true,
      priceFrom: scan.priceFrom,
      priceUnit: scan.priceUnit,
      maxCapacity: scan.maxCapacity,
      packages: scan.packages,
      enquiryUrl: scan.enquiryUrl,
      byoFoodAllowed: scan.byoFoodAllowed,
      foodProvided: scan.foodProvided,
      kitchenFacilities: scan.kitchenFacilities,
      source: 'regex',
    });
  }

  // LLM fallback: let the model decide capability + structured fields.
  try {
    const $ = cheerio.load(html);
    $('script, style, noscript, svg').remove();
    const pageText = ($('body').length ? $('body').text() : $.root().text())
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);

    const raw = await callNvidia({
      systemPrompt:
        "You extract children's party booking information from UK venue web pages. " +
        'Return ONLY a JSON object with keys: hosts_parties (boolean), price_from (number|null, GBP), ' +
        'price_unit ("per_child"|"per_hour"|"flat"|null), max_capacity (number|null), packages (string[]), ' +
        'enquiry_url (string|null), byo_food_allowed (boolean|null), food_provided (boolean|null), kitchen_facilities (boolean|null). Use null when unknown. Never invent values.',
      userPrompt:
        `Venue: "${name}" (${website}). Decide if it hosts children's birthday parties and ` +
        `extract party details from this page text:\n\n${pageText}`,
      signal,
    });

    const parsed = parsePartyJson(raw);
    const partyCapable =
      typeof parsed.partyCapable === 'boolean'
        ? parsed.partyCapable
        : scan.hasPartySignal
          ? true
          : null;

    return validatePartyData({
      partyCapable,
      priceFrom: parsed.priceFrom ?? scan.priceFrom,
      priceUnit: parsed.priceUnit ?? scan.priceUnit,
      maxCapacity: parsed.maxCapacity ?? scan.maxCapacity,
      packages: parsed.packages && parsed.packages.length ? parsed.packages : scan.packages,
      enquiryUrl: parsed.enquiryUrl ?? scan.enquiryUrl,
      byoFoodAllowed: parsed.byoFoodAllowed ?? scan.byoFoodAllowed,
      foodProvided: parsed.foodProvided ?? scan.foodProvided,
      kitchenFacilities: parsed.kitchenFacilities ?? scan.kitchenFacilities,
      cateringNotes: parsed.cateringNotes ?? null,
      source: 'llm',
    });
  } catch {
    // LLM unavailable — fall back to a weak regex-only signal if present.
    if (scan.hasPartySignal) {
      return validatePartyData({
        partyCapable: true,
        priceFrom: scan.priceFrom,
        priceUnit: scan.priceUnit,
        maxCapacity: scan.maxCapacity,
        packages: scan.packages,
        enquiryUrl: scan.enquiryUrl,
        byoFoodAllowed: scan.byoFoodAllowed,
        foodProvided: scan.foodProvided,
        kitchenFacilities: scan.kitchenFacilities,
        source: 'regex',
      });
    }
    return { ...EMPTY };
  }
}
