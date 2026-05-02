import express from 'express';
import { billingController } from '../controllers/billingController.js';

const router = express.Router();

/**
 * @route POST /api/billing/create-checkout-session
 * @desc Create a Stripe Checkout session
 */
router.post('/create-checkout-session', billingController.createCheckoutSession);

/**
 * @route POST /api/billing/webhook
 * @desc Stripe webhook handler
 */
router.post('/webhook', billingController.handleWebhook);

export default router;
