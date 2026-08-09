import { describe, it, expect } from 'vitest';
import { normalizeImageUrl } from '../../../scripts/discovery/sources/website-image-enrichment.js';
import { isBadImageUrl } from '../../../scripts/maintenance/clean-bad-images.js';

describe('Website Image Enrichment & Cleanup Helpers', () => {
  describe('normalizeImageUrl', () => {
    it('normalizes valid relative URLs to absolute HTTP/HTTPS URLs', () => {
      const baseUrl = 'https://example.com/venue';
      expect(normalizeImageUrl('/images/hero.jpg', baseUrl)).toBe('https://example.com/images/hero.jpg');
      expect(normalizeImageUrl('banner.png', baseUrl)).toBe('https://example.com/banner.png');
    });

    it('rejects invalid or non-HTTP URLs', () => {
      const baseUrl = 'https://example.com';
      expect(normalizeImageUrl('data:image/png;base64,iVBORw0KGgo...', baseUrl)).toBeNull();
      expect(normalizeImageUrl('javascript:alert(1)', baseUrl)).toBeNull();
      expect(normalizeImageUrl('', baseUrl)).toBeNull();
    });

    it('rejects unwanted image types and social patterns', () => {
      const baseUrl = 'https://example.com';
      expect(normalizeImageUrl('/logo.png', baseUrl)).toBeNull();
      expect(normalizeImageUrl('/favicon.ico', baseUrl)).toBeNull();
      expect(normalizeImageUrl('/icon.svg', baseUrl)).toBeNull();
      expect(normalizeImageUrl('https://facebook.com/badge.png', baseUrl)).toBeNull();
      expect(normalizeImageUrl('https://instagram.com/photo.jpg', baseUrl)).toBeNull();
      expect(normalizeImageUrl('/tracking-pixel.png', baseUrl)).toBeNull();
      expect(normalizeImageUrl('https://upload.wikimedia.org/wiki.png', baseUrl)).toBeNull();
    });

    it('accepts valid high quality venue images', () => {
      const baseUrl = 'https://softplayhub.co.uk';
      expect(normalizeImageUrl('/assets/gallery-1.jpg', baseUrl)).toBe('https://softplayhub.co.uk/assets/gallery-1.jpg');
      expect(normalizeImageUrl('https://cdn.softplayhub.co.uk/party-room.webp', baseUrl)).toBe('https://cdn.softplayhub.co.uk/party-room.webp');
    });
  });

  describe('isBadImageUrl', () => {
    it('identifies bad domains and static map URLs', () => {
      expect(isBadImageUrl('https://upload.wikimedia.org/wikipedia/commons/1/11/image.jpg')).toBe(true);
      expect(isBadImageUrl('https://maps.google.com/maps/api/staticmap?center=51.5')).toBe(true);
      expect(isBadImageUrl('https://www.geograph.org.uk/reuse.php?id=123')).toBe(true);
      expect(isBadImageUrl('https://property-images-uk.com/house.jpg')).toBe(true);
    });

    it('identifies vector and icon extensions', () => {
      expect(isBadImageUrl('https://example.com/logo.svg')).toBe(true);
      expect(isBadImageUrl('https://example.com/favicon.ico')).toBe(true);
    });

    it('passes valid venue photographic URLs', () => {
      expect(isBadImageUrl('https://example.com/venue-main.jpg')).toBe(false);
      expect(isBadImageUrl('https://images.unsplash.com/photo-12345')).toBe(false);
    });
  });
});
