import { Request, Response } from 'express';
import { db } from '../clients/db.js';
import { fhrsService } from '../services/fhrsService.js';
import { logger } from '../config/logger.js';

export const fhrsController = {
  /**
   * Handle lazy on-demand FHRS matching for a venue by venue ID
   *
   * If the venue already has an FHRS establishment match, return the cached rating.
   * If not, attempt to match via FHRS API by name + postcode / location.
   */
  async lazyMatchFhrs(req: Request, res: Response) {
    try {
      const venueId = parseInt(req.params.id as string, 10);

      // Validate venue ID is a positive integer
      if (isNaN(venueId) || venueId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid venue ID',
        });
      }

      // Query venue to get name, postcode, lat, lon
      const { rows: venues } = await db.query(
        `SELECT id, name, postcode, lat, lon, fhrs_establishment_id
         FROM venues WHERE id = $1`,
        [venueId]
      );

      if (venues.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found',
        });
      }

      const venue = venues[0];

      // If venue already has an FHRS match, return cached data
      if (venue.fhrs_establishment_id) {
        const { rows: establishments } = await db.query(
          `SELECT id, rating_value, rating_date FROM fhrs_establishments WHERE id = $1`,
          [venue.fhrs_establishment_id]
        );

        if (establishments.length > 0) {
          return res.json({
            success: true,
            data: {
              fhrs_establishment_id: establishments[0].id,
              rating_value: establishments[0].rating_value,
              rating_date: establishments[0].rating_date,
            },
          });
        }
      }

      // Attempt lazy on-demand matching via FHRS API
      const match = await fhrsService.matchFhrsToVenue({
        name: venue.name,
        postcode: venue.postcode,
        latitude: venue.lat ? parseFloat(venue.lat) : undefined,
        longitude: venue.lon ? parseFloat(venue.lon) : undefined,
      });

      if (!match) {
        return res.json({
          success: true,
          data: {
            fhrs_establishment_id: null,
            rating_value: null,
            rating_date: null,
          },
        });
      }

      // Upsert into fhrs_establishments table
      await db.query(
        `INSERT INTO fhrs_establishments (id, business_name, business_type, postcode, rating_value, rating_date, lat, lon, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           rating_value = COALESCE(NULLIF(EXCLUDED.rating_value, ''), fhrs_establishments.rating_value),
           rating_date = COALESCE(NULLIF(EXCLUDED.rating_date::TEXT, '')::TIMESTAMPTZ, fhrs_establishments.rating_date),
           last_updated = NOW()`,
        [
          match.id,
          match.business_name,
          match.business_type,
          match.postcode,
          match.rating_value,
          match.rating_date,
          match.lat,
          match.lon,
        ]
      );

      // Update venue with denormalized values
      await db.query(
        `UPDATE venues SET
           fhrs_establishment_id = $1,
           fhrs_rating_value = COALESCE(NULLIF($2, ''), fhrs_rating_value),
           fhrs_rating_date = COALESCE($3::TIMESTAMPTZ, fhrs_rating_date),
           fhrs_matched_at = NOW(),
           enriched_at = NOW()
         WHERE id = $4`,
        [
          match.id,
          match.rating_value,
          match.rating_date,
          venue.id,
        ]
      );

      return res.json({
        success: true,
        data: {
          fhrs_establishment_id: match.id,
          rating_value: match.rating_value,
          rating_date: match.rating_date,
        },
      });
    } catch (error) {
      logger.error({ err: error, venueId: req.params.id }, 'Error in lazyMatchFhrs controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to match FHRS',
      });
    }
  },
};
