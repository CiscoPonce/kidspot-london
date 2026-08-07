import { Request, Response } from 'express';
import { venueService } from '../services/venueService.js';
import { logger } from '../config/logger.js';
import { SearchQuery, VenueType } from '../types/venue.js';
import { searchQuerySchema, facetSearchSchema } from '../schemas/searchSchema.js';

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
   * Handle searching venues by facets
   */
  async searchByFacets(req: Request, res: Response) {
    try {
      const validationResult = facetSearchSchema.safeParse(req.query);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.issues[0]?.message || 'Invalid search parameters'
        });
      }

      const response = await venueService.searchVenuesByFacets(validationResult.data as any);
      return res.json(response);
    } catch (error) {
      logger.error({ err: error }, 'Error in searchByFacets controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to search venues by facets'
      });
    }
  },

  /**
   * Handle getting list of available facets
   */
  async getFacets(req: Request, res: Response) {
    try {
      const { FACET_LABELS } = await import('../types/venue.js');
      return res.json({
        success: true,
        data: FACET_LABELS
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getFacets controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch facets'
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

      // Track impression
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers['referer'] as string;
      venueService.trackImpression(response.data.basic.id.toString(), ip, userAgent, referrer);

      return res.json(response);
    } catch (error) {
      logger.error({ err: error, slug: String(req.params.slug ?? '') }, 'Error in getVenueDetailsBySlug controller');
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

      // Track impression
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers['referer'] as string;
      venueService.trackImpression(id, ip, userAgent, referrer);

      return res.json(response);
    } catch (error) {
      logger.error({ err: error, id: String(req.params.id ?? '') }, 'Error in getVenueDetailsById controller');
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
  },

  /**
   * Handle tracking a venue click
   */
  async trackClick(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const type = (req.body ?? {}).type as string; // 'website', 'booking', etc.
      
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!id || !type) {
        return res.status(400).json({
          success: false,
          error: 'id and type are required'
        });
      }

      await venueService.trackClick(id, type, ip, userAgent);
      
      return res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Error in trackClick controller');
      return res.status(500).json({
        success: false,
        error: 'Failed to track click'
      });
    }
  }
};
