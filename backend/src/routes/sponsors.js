const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

// Middleware to check if user is admin (simplified for now)
const requireAdmin = (req, res, next) => {
  // In production, implement proper authentication
  // For now, just check for an admin header
  if (req.headers['x-admin-key'] === process.env.ADMIN_KEY) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get sponsor statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM get_sponsor_stats()');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching sponsor stats:', error);
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
      params.push(tier);
    }
    
    query += ' ORDER BY sponsor_tier, sponsor_priority DESC NULLS LAST';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching sponsored venues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sponsored venues'
    });
  }
});

// Update venue sponsor tier (admin only)
router.put('/venues/:id/tier', requireAdmin, async (req, res) => {
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
    
    await pool.query('SELECT update_sponsor_tier($1, $2, $3)', [id, tier, priority]);
    
    res.json({
      success: true,
      message: 'Sponsor tier updated successfully'
    });
  } catch (error) {
    console.error('Error updating sponsor tier:', error);
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
    
    const result = await pool.query(
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
    console.error('Error fetching venue sponsor details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue sponsor details'
    });
  }
});

// Bulk update sponsor tiers (admin only)
router.post('/venues/bulk/tier', requireAdmin, async (req, res) => {
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
        await pool.query('SELECT update_sponsor_tier($1, $2, $3)', [
          venue.id,
          venue.tier,
          venue.priority
        ]);
        updated++;
      } catch (error) {
        errors++;
      }
    }
    
    res.json({
      success: true,
      data: {
        updated,
        errors,
        total: venues.length
      }
    });
  } catch (error) {
    console.error('Error bulk updating sponsor tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update sponsor tiers'
    });
  }
});

// Get sponsor pricing information
router.get('/pricing', (req, res) => {
  // This would typically come from a database or config
  // For now, return static pricing information
  res.json({
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
    }
  });
});

module.exports = router;
