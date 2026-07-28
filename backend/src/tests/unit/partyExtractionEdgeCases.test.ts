import { describe, it, expect } from 'vitest';
import { scanPartyHtml } from '../../utils/partyExtraction.js';

describe('Party Extraction Edge Cases & Robustness', () => {
  it('ignores sub-£5 price noise (deposits/fees) and drops price from regex scan', () => {
    const html = `<div>Birthday party packages! Small booking fee of £1.50 applies. Entry £2.00 deposit.</div>`;
    const scan = scanPartyHtml(html, 'https://example.com');
    expect(scan.hasPartySignal).toBe(true);
    expect(scan.priceFrom).toBeNull(); // Floor is £5.00
  });

  it('correctly extracts valid per-child pricing above floor', () => {
    const html = `<div>Kids Birthday Parties from £14.50 per child!</div>`;
    const scan = scanPartyHtml(html, 'https://example.com');
    expect(scan.hasPartySignal).toBe(true);
    expect(scan.priceFrom).toBe(14.50);
    expect(scan.priceUnit).toBe('per_child');
  });

  it('correctly extracts valid per-hour hall hire pricing', () => {
    const html = `<h1>Community Hall Party Hire</h1><p>Main hall rate is £40 per hour for weekend events.</p>`;
    const scan = scanPartyHtml(html, 'https://example.com');
    expect(scan.hasPartySignal).toBe(true);
    expect(scan.priceFrom).toBe(40.0);
    expect(scan.priceUnit).toBe('per_hour');
  });

  it('strips script, style, and svg tags before extracting party text', () => {
    const html = `
      <script>var party = "from £2.00 per child";</script>
      <style>.party { color: red; }</style>
      <h1>Gym & Swimming Pool</h1>
      <p>Fitness memberships from £30 per month.</p>
    `;
    const scan = scanPartyHtml(html, 'https://example.com');
    expect(scan.hasPartySignal).toBe(false);
    expect(scan.priceFrom).toBeNull();
  });

  it('correctly extracts party link and resolves relative URLs while filtering mailto/tel', () => {
    const html = `
      <a href="tel:02012345678">Call Us</a>
      <a href="mailto:info@hall.com">Email Us</a>
      <a href="/parties/birthday-booking">Book a Party Now</a>
    `;
    const scan = scanPartyHtml(html, 'https://example.com/venue');
    expect(scan.enquiryUrl).toBe('https://example.com/parties/birthday-booking');
  });

  it('correctly extracts maximum party capacity limits', () => {
    const html = `<div>Party rooms accommodate up to 45 children per session.</div>`;
    const scan = scanPartyHtml(html, 'https://example.com');
    expect(scan.maxCapacity).toBe(45);
  });
});
