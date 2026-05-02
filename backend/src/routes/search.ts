import express from 'express';
import { searchController } from '../controllers/searchController.js';

const router = express.Router();

/**
 * @route GET /api/search/slugs
 * @desc Get all venue slugs for sitemap
 */
router.get('/slugs', searchController.getAllSlugs);

/**
 * @route GET /api/search/venues
 * @desc Search venues by location/radius or borough
 */
router.get('/venues', searchController.searchVenues);

/**
 * @route GET /api/search/venues/slug/:slug/details
 * @desc Get venue details by slug
 */
router.get('/venues/slug/:slug/details', searchController.getVenueDetailsBySlug);

/**
 * @route GET /api/search/venues/:id/details
 * @desc Get venue details by numeric or fallback ID
 */
router.get('/venues/:id/details', searchController.getVenueDetailsById);

/**
 * @route POST /api/search/venues/:id/click
 * @desc Track outbound click (website, booking, etc.)
 */
router.post('/venues/:id/click', searchController.trackClick);

export default router;
