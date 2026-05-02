import { Request, Response } from 'express';
import stripe from '../clients/stripe.js';
import env from '../config/env.js';
import { db } from '../clients/db.js';
import { logger } from '../config/logger.js';
import { auditService } from '../services/auditService.js';

// Mapping of tiers to Stripe Price IDs (placeholders for now)
const PRICE_MAP: Record<string, string> = {
  'bronze_monthly': process.env.STRIPE_PRICE_BRONZE || 'price_bronze_monthly',
  'silver_monthly': process.env.STRIPE_PRICE_SILVER || 'price_silver_monthly',
  'gold_monthly': process.env.STRIPE_PRICE_GOLD || 'price_gold_monthly',
};

export const billingController = {
  /**
   * Create a Stripe Checkout Session
   * POST /api/billing/create-checkout-session
   */
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { venueId, tier, interval = 'monthly' } = req.body;

      if (!venueId || !tier) {
        return res.status(400).json({
          success: false,
          error: 'venueId and tier are required'
        });
      }

      // 1. Verify venue is claimed and verified
      const venueResult = await db.query(
        'SELECT id, name, current_claim_status, claim_email, stripe_customer_id FROM venues WHERE id = $1',
        [venueId]
      );

      if (venueResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      const venue = venueResult.rows[0];

      if (venue.current_claim_status !== 'verified') {
        return res.status(403).json({
          success: false,
          error: 'Venue must be verified before purchasing sponsorship'
        });
      }

      // 2. Get Price ID
      const priceKey = `${tier}_${interval}`;
      const priceId = PRICE_MAP[priceKey];

      if (!priceId) {
        return res.status(400).json({
          success: false,
          error: `Invalid tier or interval: ${priceKey}`
        });
      }

      // 3. Create or get Stripe Customer
      let customerId = venue.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: venue.claim_email,
          name: venue.name,
          metadata: {
            venueId: venue.id.toString()
          }
        });
        customerId = customer.id;
        
        // Update venue with customer ID
        await db.query(
          'UPDATE venues SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, venue.id]
        );
      }

      // 4. Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&venueId=${venue.id}`,
        cancel_url: `${env.FRONTEND_URL}/venue/${venue.slug}/pricing`,
        subscription_data: {
          metadata: {
            venueId: venue.id.toString(),
            tier: tier
          }
        },
        metadata: {
          venueId: venue.id.toString(),
          tier: tier
        }
      });

      return res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error in createCheckoutSession');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create checkout session'
      });
    }
  },

  /**
   * Handle Stripe Webhooks
   * POST /api/billing/webhook
   */
  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      logger.error({ err }, 'Webhook signature verification failed');
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const venueId = session.metadata.venueId;
          const tier = session.metadata.tier;
          const subscriptionId = session.subscription;

          logger.info({ venueId, tier, subscriptionId }, 'Checkout session completed');

          await db.query(
            'UPDATE venues SET sponsor_tier = $1, stripe_subscription_id = $2 WHERE id = $3',
            [tier, subscriptionId, venueId]
          );

          await auditService.logAction({
            actionType: 'sponsorship_activated',
            targetId: parseInt(venueId),
            payload: { tier, subscriptionId }
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const venueId = subscription.metadata.venueId;

          logger.info({ venueId }, 'Subscription deleted');

          await db.query(
            'UPDATE venues SET sponsor_tier = NULL, stripe_subscription_id = NULL WHERE id = $1',
            [venueId]
          );

          await auditService.logAction({
            actionType: 'sponsorship_cancelled',
            targetId: parseInt(venueId),
            payload: { subscriptionId: subscription.id }
          });
          break;
        }

        // Add more handlers as needed (e.g. subscription updated)
      }

      res.json({ received: true });
    } catch (error) {
      logger.error({ err: error }, 'Error processing webhook');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
};
