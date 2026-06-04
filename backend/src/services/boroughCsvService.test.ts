import { describe, it, expect } from 'vitest';
import { boroughCsvService } from './boroughCsvService.js';

describe('boroughCsvService contact extractors', () => {
  it('extracts phone, email, website, and booking URL from common column names', () => {
    const raw = {
      name: 'St Mary Community Hall',
      postcode: 'E8 1DY',
      phone: '020 7923 4567',
      email: 'hire@example-hall.org.uk',
      website: 'www.example-hall.org.uk',
      booking_url: 'https://council.gov.uk/hire/st-mary',
    };
    expect(boroughCsvService.extractPhone(raw)).toBeTruthy();
    expect(boroughCsvService.extractEmail(raw)).toBe('hire@example-hall.org.uk');
    expect(boroughCsvService.extractWebsite(raw)).toBe('https://www.example-hall.org.uk');
    expect(boroughCsvService.extractBookingUrl(raw)).toContain('council.gov.uk');
  });

  it('reports column coverage for parsed rows', () => {
    const records = boroughCsvService.parseCsv(
      'name,postcode,phone\nHall A,SW1A 1AA,020 7000 0001\nHall B,SW1A 2AA,\n',
    );
    const report = boroughCsvService.reportColumnCoverage(records, ['name', 'postcode', 'phone']);
    expect(report.row_count).toBe(2);
    expect(report.with_phone).toBe(1);
    expect(report.with_any_contact).toBe(1);
    expect(report.contact_header_matches).toContain('phone');
  });

  it('skips junk website URLs', () => {
    expect(boroughCsvService.extractWebsite({ website: 'https://www.yelp.com/biz/foo' })).toBeUndefined();
  });
});
