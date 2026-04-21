-- Migration 006: Revenue Schema Preparation
-- Adds claim_status and Stripe-related columns for Phase 8

-- Create ENUM for claim_status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM ('unclaimed', 'pending', 'verified');
    END IF;
END$$;

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS current_claim_status claim_status DEFAULT 'unclaimed',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create indices for new columns
CREATE INDEX IF NOT EXISTS idx_venues_claim_status ON venues(current_claim_status);
CREATE INDEX IF NOT EXISTS idx_venues_stripe_customer_id ON venues(stripe_customer_id);

-- Note: sponsor_tier already exists with values 'bronze', 'silver', 'gold'.
-- We will use the existing sponsor_tier column for Phase 8.
