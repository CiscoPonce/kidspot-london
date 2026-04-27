import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { db } from '../../clients/db';
import { redis } from '../../clients/redis';

// Mock db and redis
vi.mock('../../clients/db', () => ({
  db: {
    query: vi.fn(),
  },
  default: {
    query: vi.fn(),
  }
}));

vi.mock('../../clients/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn(),
    set: vi.fn(),
    on: vi.fn(),
    call: vi.fn(),
  },
  default: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn(),
    set: vi.fn(),
    on: vi.fn(),
    call: vi.fn(),
  }
}));

// Mock rate limiter to avoid RedisStore dependency issues
vi.mock('../../middleware/rateLimit', () => ({
  apiLimiter: (req: any, res: any, next: any) => next(),
  braveSearchLimiter: vi.fn().mockResolvedValue(undefined),
  default: (req: any, res: any, next: any) => next(),
}));

describe('Search API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [] })
    }) as any;
    delete process.env.BRAVE_API_KEY;
  });

  describe('GET /api/search/venues', () => {
    it('should return 400 if no location parameters are provided', async () => {
      const response = await request(app).get('/api/search/venues');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return venues for valid lat/lon', async () => {
      const mockVenues = [
        {
          id: '1',
          name: 'Kid Park',
          address: '123 Street',
          latitude: 51.5,
          longitude: -0.1,
          types: ['park'],
          kid_score: 10
        }
      ];

      (db.query as any).mockResolvedValueOnce({ rows: mockVenues });

      const response = await request(app)
        .get('/api/search/venues')
        .query({ lat: 51.5, lon: -0.1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.all).toHaveLength(1);
      expect(response.body.data.all[0].name).toBe('Kid Park');
    });

    it('should return venues for a valid borough', async () => {
      const mockVenues = [
        {
          id: '2',
          name: 'Hackney Softplay',
          address: 'Hackney',
          latitude: 51.54,
          longitude: -0.05,
          types: ['softplay'],
          kid_score: 15
        }
      ];

      (db.query as any).mockResolvedValueOnce({ rows: mockVenues });

      const response = await request(app)
        .get('/api/search/venues')
        .query({ borough: 'Hackney' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.all).toHaveLength(1);
      expect(response.body.data.all[0].name).toBe('Hackney Softplay');
    });
  });
});
