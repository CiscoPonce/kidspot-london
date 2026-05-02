import { db } from '../clients/db.js';
import { redis } from '../clients/redis.js';
import { logger } from '../config/logger.js';
import env from '../config/env.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const OTP_TTL = 60 * 10; // 10 minutes
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export const ownerService = {
  /**
   * Request an OTP for login
   */
  async requestOtp(email: string): Promise<string | null> {
    try {
      // 1. Verify email belongs to a verified venue owner
      const result = await db.query(
        "SELECT id FROM venues WHERE claim_email = $1 AND current_claim_status = 'verified'",
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // 2. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Store in Redis
      const cacheKey = `otp:${email}`;
      await redis.set(cacheKey, otp, 'EX', OTP_TTL);

      return otp;
    } catch (error) {
      logger.error({ err: error, email }, 'Error requesting OTP');
      return null;
    }
  },

  /**
   * Verify OTP and issue JWT
   */
  async verifyOtp(email: string, otp: string): Promise<{ token: string; venues: any[] } | null> {
    try {
      const cacheKey = `otp:${email}`;
      const storedOtp = await redis.get(cacheKey);

      if (!storedOtp || storedOtp !== otp) {
        return null;
      }

      // Delete OTP after successful use
      await redis.del(cacheKey);

      // Get owner's venues
      const result = await db.query(
        "SELECT id, name, slug, sponsor_tier FROM venues WHERE claim_email = $1 AND current_claim_status = 'verified'",
        [email]
      );

      const venues = result.rows;

      // Issue JWT
      const token = jwt.sign(
        { email, venueIds: venues.map(v => v.id) },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { token, venues };
    } catch (error) {
      logger.error({ err: error, email }, 'Error verifying OTP');
      return null;
    }
  },

  /**
   * Get stats for an owner's venue
   */
  async getVenueStats(venueId: number) {
    try {
      // Views (impressions)
      const viewsResult = await db.query(
        'SELECT COUNT(*) FROM venue_views WHERE venue_id = $1',
        [venueId]
      );

      // Clicks
      const clicksResult = await db.query(
        'SELECT click_type, COUNT(*) FROM outbound_clicks WHERE venue_id = $1 GROUP BY click_type',
        [venueId]
      );

      // Daily trend (last 30 days)
      const trendResult = await db.query(
        `SELECT 
           d.day::date as date,
           COUNT(vv.id) as views,
           COUNT(oc.id) as clicks
         FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day') d(day)
         LEFT JOIN venue_views vv ON vv.venue_id = $1 AND vv.created_at::date = d.day::date
         LEFT JOIN outbound_clicks oc ON oc.venue_id = $1 AND oc.created_at::date = d.day::date
         GROUP BY d.day
         ORDER BY d.day ASC`,
        [venueId]
      );

      return {
        totalViews: parseInt(viewsResult.rows[0].count),
        clicksByType: clicksResult.rows,
        totalClicks: clicksResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        trend: trendResult.rows
      };
    } catch (error) {
      logger.error({ err: error, venueId }, 'Error fetching venue stats');
      throw error;
    }
  }
};
