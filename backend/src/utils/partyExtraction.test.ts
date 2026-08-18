import { describe, it, expect } from 'vitest';
import { scanPartyHtml, validatePartyData, parsePartyJson } from './partyExtraction.js';

describe('scanPartyHtml', () => {
  it('detects party signal, price-per-child, capacity and an enquiry link', () => {
    const html = `<html><body>
      <h1>Birthday Parties</h1>
      <p>Our party packages start from £12.50 per child. Up to 30 children welcome.</p>
      <a href="/parties/book">Book a party</a>
    </body></html>`;
    const r = scanPartyHtml(html, 'https://example.com');
    expect(r.hasPartySignal).toBe(true);
    expect(r.priceFrom).toBe(12.5);
    expect(r.priceUnit).toBe('per_child');
    expect(r.maxCapacity).toBe(30);
    expect(r.enquiryUrl).toBe('https://example.com/parties/book');
  });

  it('detects a per-hour party room price', () => {
    const html = `<body><p>Party room hire from £45 per hour. Birthday parties welcome.</p></body>`;
    const r = scanPartyHtml(html);
    expect(r.hasPartySignal).toBe(true);
    expect(r.priceFrom).toBe(45);
    expect(r.priceUnit).toBe('per_hour');
  });

  it('returns no signal for a generic page', () => {
    const r = scanPartyHtml('<body><p>Opening hours Mon-Fri 9-5. Swimming lanes available.</p></body>');
    expect(r.hasPartySignal).toBe(false);
    expect(r.priceFrom).toBeNull();
    expect(r.maxCapacity).toBeNull();
    expect(r.enquiryUrl).toBeNull();
  });
});

describe('validatePartyData', () => {
  it('clamps out-of-range price and capacity to null', () => {
    expect(validatePartyData({ priceFrom: 99999 }).priceFrom).toBeNull();
    expect(validatePartyData({ priceFrom: 0 }).priceFrom).toBeNull();
    expect(validatePartyData({ maxCapacity: 99999 }).maxCapacity).toBeNull();
    expect(validatePartyData({ maxCapacity: 2.5 }).maxCapacity).toBeNull();
  });

  it('defaults the unit to per_child when a price is present without a unit', () => {
    const v = validatePartyData({ priceFrom: 15 });
    expect(v.priceFrom).toBe(15);
    expect(v.priceUnit).toBe('per_child');
  });

  it('rejects non-http(s) enquiry URLs', () => {
    expect(validatePartyData({ enquiryUrl: 'javascript:alert(1)' }).enquiryUrl).toBeNull();
    expect(validatePartyData({ enquiryUrl: 'mailto:a@b.com' }).enquiryUrl).toBeNull();
    expect(validatePartyData({ enquiryUrl: 'https://x.com/parties' }).enquiryUrl).toBe('https://x.com/parties');
  });

  it('detects BYO food, in-house food, and kitchen facilities in scanPartyHtml', () => {
    const hallHtml = `<body>
      <h1>Community Hall Birthday Parties</h1>
      <p>Self-catering welcome. Full kitchen access with fridge and microwave for party food. Bring your own food and birthday cake.</p>
    </body>`;
    const hallScan = scanPartyHtml(hallHtml);
    expect(hallScan.hasPartySignal).toBe(true);
    expect(hallScan.byoFoodAllowed).toBe(true);
    expect(hallScan.kitchenFacilities).toBe(true);

    const softplayHtml = `<body>
      <h1>Soft Play Party Packages</h1>
      <p>Hot food included with pizza and nuggets, plus unlimited squash. Party meal boxes for all kids.</p>
    </body>`;
    const softplayScan = scanPartyHtml(softplayHtml);
    expect(softplayScan.hasPartySignal).toBe(true);
    expect(softplayScan.foodProvided).toBe(true);
  });

  it('dedupes and caps package names', () => {
    const v = validatePartyData({ packages: ['Gold', 'Gold', ' Silver ', ''] });
    expect(v.packages).toEqual(['Gold', 'Silver']);
  });
});

describe('parsePartyJson', () => {
  it('parses a JSON object wrapped in prose', () => {
    const raw =
      'Sure! Here you go: {"hosts_parties": true, "price_from": 20, "price_unit": "per_child", "max_capacity": 25, "packages": ["Gold"], "enquiry_url": "https://x.com/p"} hope that helps';
    const p = parsePartyJson(raw);
    expect(p.partyCapable).toBe(true);
    expect(p.priceFrom).toBe(20);
    expect(p.priceUnit).toBe('per_child');
    expect(p.maxCapacity).toBe(25);
    expect(p.enquiryUrl).toBe('https://x.com/p');
  });

  it('parses raw and wrapped JSON with catering fields', () => {
    const raw = '{"hosts_parties": true, "price_from": 18.5, "price_unit": "per_child", "byo_food_allowed": false, "food_provided": true, "kitchen_facilities": false}';
    const parsed = parsePartyJson(raw);
    expect(parsed.partyCapable).toBe(true);
    expect(parsed.priceFrom).toBe(18.5);
    expect(parsed.byoFoodAllowed).toBe(false);
    expect(parsed.foodProvided).toBe(true);
    expect(parsed.kitchenFacilities).toBe(false);
  });

  it('returns an empty object for non-JSON', () => {
    expect(parsePartyJson('no json here')).toEqual({});
  });
});
