-- Migration 009: Create venue claims table
-- Tracks owner claim attempts and verification status

CREATE TABLE IF NOT EXISTS venue_claims (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT REFERENCES venues(id) NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    verification_token TEXT NOT NULL UNIQUE,
    verified_at TIMESTAMPTZ,
    admin_approved_at TIMESTAMPTZ,
    admin_rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup and status filtering
CREATE INDEX IF NOT EXISTS idx_venue_claims_token ON venue_claims(verification_token);
CREATE INDEX IF NOT EXISTS idx_venue_claims_venue ON venue_claims(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_claims_email ON venue_claims(email);

-- Add claim_email to venues if not exists (already in plan, let's be explicit)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS claim_email TEXT;
