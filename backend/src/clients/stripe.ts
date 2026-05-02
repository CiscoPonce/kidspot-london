import Stripe from 'stripe';
import env from '../config/env.js';
import { logger } from '../config/logger.js';

if (!env.STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY not set. Billing features will be disabled.');
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-01-27' as any, // Use latest stable or pinned version
  typescript: true,
});

export default stripe;
