-- Migration 038: Add FHRS rating fields to venues
-- Denormalized rating fields for fast reads (avoids JOIN in hot-path venue detail queries)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fhrs_rating_value TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fhrs_rating_date TIMESTAMPTZ;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fhrs_matched_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_venues_fhrs_unmatched ON venues(fhrs_matched_at) WHERE fhrs_establishment_id IS NULL;
