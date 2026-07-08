import express from 'express';
import { fhrsController } from '../controllers/fhrsController.js';

const router = express.Router();

/**
 * @route GET /api/fhrs/match/:id
 * @desc Lazy FHRS match for a venue by venue ID
 */
router.get('/match/:id', fhrsController.lazyMatchFhrs);

export default router;
