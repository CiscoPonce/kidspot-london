-- Migration: Enrich Venues with scoring and ratings
-- Adds kid_score, rating, user_ratings_total, and enriched_at columns

ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS kid_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC,
ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Add index for kid_score to allow fast sorting
CREATE INDEX IF NOT EXISTS idx_venues_kid_score ON venues(kid_score);

-- Add index for enriched_at to track discovery progress
CREATE INDEX IF NOT EXISTS idx_venues_enriched_at ON venues(enriched_at);
