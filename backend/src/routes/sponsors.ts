import express from 'express';
import { db } from '../clients/db.js';
import { redis } from '../clients/redis.js';
import { adminAuth } from '../middleware/admin.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Cache TTLs
const CACHE_TTL = {
  SPONSOR_STATS: 300,     // 5 minutes for sponsor statistics
  SPONSOR_PRICING: 86400  // 24 hours for sponsor pricing
};

// Helper to generate cache keys
function getSponsorStatsCacheKey() {
  return 'sponsors:stats';
}

function getSponsorPricingCacheKey() {
  return 'sponsors:pricing';
}

// Cache invalidation helpers
async function invalidateSearchCaches() {
  try {
    let cursor = '0';
    let keysCount = 0;
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'search:*', 'COUNT', 100);
      cursor = newCursor;
      if (keys.length > 0) {
        keysCount += keys.length;
        await redis.del(...keys);
      }
    } while (cursor !== '0');

    if (keysCount > 0) {
      logger.info({ keysCount }, 'Invalidated search cache keys');
    }
  } catch (error) {
    logger.warn({ err: error }, 'Error invalidating search caches');
  }
}

async function invalidateSponsorStatsCache() {
  try {
    await redis.del(getSponsorStatsCacheKey());
    logger.info('Invalidated sponsor stats cache');
  } catch (error) {
    logger.warn({ err: error }, 'Error invalidating sponsor stats cache');
  }
}

// Get sponsor statistics
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = getSponsorStatsCacheKey();

    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info({ cacheKey }, 'Cache hit for sponsor stats');
        const parsedCache = JSON.parse(cached);
        return res.json({
          ...parsedCache,
          meta: {
            ...(parsedCache.meta || {}),
            cache_hit: true
          }
        });
      }
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Cache read error (continuing without cache)');
    }

    const result = await db.query('SELECT * FROM get_sponsor_stats()');

    const response = {
      success: true,
      data: result.rows,
      meta: {
        cache_hit: false
      }
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.SPONSOR_STATS);
      logger.info({ cacheKey }, 'Cached sponsor stats');
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Cache write error (continuing without cache)');
    }

    res.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching sponsor stats');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsor statistics'
    });
  }
});

// Get all sponsored venues
router.get('/venues', async (req, res) => {
  try {
    const { tier } = req.query;
    
    let query = `
      SELECT id, name, type, lat, lon, sponsor_tier, sponsor_priority, source
      FROM venues
      WHERE is_active = TRUE
      AND sponsor_tier IS NOT NULL
    `;
    
    const params = [];
    
    if (tier) {
      query += ' AND sponsor_tier = $1';
      params.push(tier as string);
    }
    
    query += ' ORDER BY sponsor_tier, sponsor_priority DESC NULLS LAST';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching sponsored venues');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsored venues'
    });
  }
});

// Update venue sponsor tier (admin only)
router.put('/venues/:id/tier', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, priority } = req.body;

    // Validate tier
    const validTiers = ['bronze', 'silver', 'gold', null];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sponsor tier. Must be bronze, silver, gold, or null'
      });
    }

    // Validate priority
    if (priority !== undefined && (typeof priority !== 'number' || priority < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority. Must be a non-negative number'
      });
    }

    await db.query('SELECT update_sponsor_tier($1, $2, $3)', [id, tier, priority]);

    // Invalidate caches after tier update
    await invalidateSearchCaches();
    await invalidateSponsorStatsCache();

    res.json({
      success: true,
      message: 'Sponsor tier updated successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating sponsor tier');
    res.status(500).json({
      success: false,
      error: 'Failed to update sponsor tier'
    });
  }
});

// Get venue sponsor details
router.get('/venues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT id, name, type, lat, lon, sponsor_tier, sponsor_priority, source, last_scraped
       FROM venues
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching venue sponsor details');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue sponsor details'
    });
  }
});

// Bulk update sponsor tiers (admin only)
router.post('/venues/bulk/tier', adminAuth, async (req, res) => {
  try {
    const { venues } = req.body; // Array of { id, tier, priority }

    if (!Array.isArray(venues) || venues.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'venues must be a non-empty array'
      });
    }

    const validTiers = ['bronze', 'silver', 'gold', null];
    let updated = 0;
    let errors = 0;

    for (const venue of venues) {
      if (!validTiers.includes(venue.tier)) {
        errors++;
        continue;
      }

      try {
        await db.query('SELECT update_sponsor_tier($1, $2, $3)', [
          venue.id,
          venue.tier,
          venue.priority
        ]);
        updated++;
      } catch (error) {
        errors++;
      }
    }

    // Invalidate caches after bulk tier update
    await invalidateSearchCaches();
    await invalidateSponsorStatsCache();

    res.json({
      success: true,
      data: {
        updated,
        errors,
        total: venues.length
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error bulk updating sponsor tiers');
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update sponsor tiers'
    });
  }
});

// Get sponsor pricing information
router.get('/pricing', async (req, res) => {
  try {
    const cacheKey = getSponsorPricingCacheKey();

    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info({ cacheKey }, 'Cache hit for sponsor pricing');
        const parsedCache = JSON.parse(cached);
        return res.json({
          ...parsedCache,
          meta: {
            ...(parsedCache.meta || {}),
            cache_hit: true
          }
        });
      }
    } catch (cacheError: any) {
      logger.warn({ err: cacheError }, 'Cache read error (continuing without cache)');
    }

    // Static pricing information (cached for 24 hours)
    const response = {
      success: true,
      data: {
        tiers: {
          bronze: {
            name: 'Bronze',
            description: 'Appear in top 10 results with subtle badge',
            features: [
              'Top 10 placement',
              'Subtle badge',
              'Basic analytics'
            ],
            pricing: {
              monthly: 99,
              yearly: 990
            }
          },
          silver: {
            name: 'Silver',
            description: 'Appear in top 5 results with prominent badge',
            features: [
              'Top 5 placement',
              'Prominent badge',
              'Advanced analytics',
              'Priority support'
            ],
            pricing: {
              monthly: 199,
              yearly: 1990
            }
          },
          gold: {
            name: 'Gold',
            description: 'Appear in top 3 results with featured styling',
            features: [
              'Top 3 placement',
              'Featured styling',
              'Premium analytics',
              'Dedicated support',
              'Custom branding'
            ],
            pricing: {
              monthly: 499,
              yearly: 4990
            }
          }
        }
      },
      meta: {
        cache_hit: false
      }
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL.SPONSOR_PRICING);
      logger.info({ cacheKey }, 'Cached sponsor pricing');
    } catch (cacheError: any) {
      logger.warn({ err: cacheError }, 'Cache write error (continuing without cache)');
    }

    res.json(response);
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching sponsor pricing');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsor pricing'
    });
  }
});

export default router;
