import express from 'express';
import { ownerController } from '../controllers/ownerController.js';
import { ownerAuth, ensureVenueAccess } from '../middleware/ownerAuth.js';

const router = express.Router();

/**
 * @route POST /api/owner/login
 * @desc Request OTP
 */
router.post('/login', ownerController.login);

/**
 * @route POST /api/owner/verify
 * @desc Verify OTP and get JWT
 */
router.post('/verify', ownerController.verify);

/**
 * @route GET /api/owner/venues/:id/stats
 * @desc Get performance metrics for a specific venue
 */
router.get('/venues/:id/stats', ownerAuth, ensureVenueAccess, ownerController.getVenueStats);

export default router;
