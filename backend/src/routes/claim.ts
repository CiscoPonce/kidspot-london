import express from 'express';
import { claimController } from '../controllers/claimController.js';
import { adminAuth } from '../middleware/admin.js';

const router = express.Router();

/**
 * @route POST /api/venues/:id/claim
 * @desc Initiate a venue claim
 */
router.post('/:id/claim', claimController.initiateClaim);

/**
 * @route GET /api/venues/claim/verify
 * @desc Verify email token
 */
router.get('/claim/verify', claimController.verifyClaim);

/**
 * @route POST /api/admin/claims/:id/approve
 * @desc Approve a verified claim (Admin only)
 */
router.post('/admin/claims/:id/approve', adminAuth, claimController.approveClaim);

export default router;
