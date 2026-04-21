import { Request, Response } from 'express';
import { venueService } from '../services/venueService.js';
import { logger } from '../config/logger.js';
import { SearchQuery, VenueType } from '../types/venue.js';
import { searchQuerySchema } from '../schemas/searchSchema.js';

export const searchController = {
  /**
   * Handle searching venues
   */
  async searchVenues(req: Request, res: Response) {
    try {
      const validationResult = searchQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0]?.message || 'Invalid search parameters',
          details: validationResult.error.message
        });
      }

      const query: SearchQuery = validationResult.data as SearchQuery;

      const response = await venueService.searchVenues(query);
      return res.json(response);
    } catch (error) {
      logger.error({ err: error }, 'Error in searchVenues controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to search venues'
      });
    }
  },

  /**
   * Handle getting venue details by slug
   */
  async getVenueDetailsBySlug(req: Request, res: Response) {
    try {
      const slug = req.params.slug as string;
      if (!slug) {
        return res.status(400).json({
          success: false,
          error: 'slug is required'
        });
      }

      const response = await venueService.getVenueDetailsBySlug(slug);
      if (!response) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      return res.json(response);
    } catch (error) {
      logger.error({ err: error, slug: req.params.slug }, 'Error in getVenueDetailsBySlug controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch venue details'
      });
    }
  },

  /**
   * Handle getting venue details by ID
   */
  async getVenueDetailsById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'id is required'
        });
      }

      const response = await venueService.getVenueDetailsById(id);
      if (!response) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      return res.json(response);
    } catch (error) {
      logger.error({ err: error, id: req.params.id }, 'Error in getVenueDetailsById controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch venue details'
      });
    }
  },

  /**
   * Handle getting all venue slugs
   */
  async getAllSlugs(req: Request, res: Response) {
    try {
      const slugs = await venueService.getAllSlugs();
      return res.json({
        success: true,
        data: slugs
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getAllSlugs controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch slugs'
      });
    }
  }
};
