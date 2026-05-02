import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';

export const revenueService = {
  /**
   * Get platform revenue statistics
   */
  async getRevenueStats() {
    try {
      const result = await db.query(`
        SELECT 
          sponsor_tier,
          COUNT(*) as venue_count,
          SUM(
            CASE 
              WHEN sponsor_tier = 'gold' THEN 499
              WHEN sponsor_tier = 'silver' THEN 199
              WHEN sponsor_tier = 'bronze' THEN 99
              ELSE 0
            END
          ) as estimated_mrr
        FROM venues
        WHERE sponsor_tier IS NOT NULL
        GROUP BY sponsor_tier;
      `);

      const totalActiveSubscriptions = await db.query(
        'SELECT COUNT(*) FROM venues WHERE stripe_subscription_id IS NOT NULL'
      );

      const totalClaimedVenues = await db.query(
        "SELECT COUNT(*) FROM venues WHERE current_claim_status = 'verified'"
      );

      return {
        tierDistribution: result.rows,
        totalActiveSubscriptions: parseInt(totalActiveSubscriptions.rows[0].count),
        totalClaimedVenues: parseInt(totalClaimedVenues.rows[0].count),
        totalEstimatedMRR: result.rows.reduce((sum, row) => sum + (parseInt(row.estimated_mrr) || 0), 0)
      };
    } catch (error) {
      logger.error({ err: error }, 'Error calculating revenue stats');
      throw error;
    }
  },

  /**
   * List all sponsors with details
   */
  async listSponsors() {
    const result = await db.query(`
      SELECT 
        id, name, slug, sponsor_tier, stripe_subscription_id, 
        claim_email, claimed_at
      FROM venues
      WHERE sponsor_tier IS NOT NULL OR current_claim_status = 'verified'
      ORDER BY claimed_at DESC NULLS LAST
    `);
    return result.rows;
  }
};
