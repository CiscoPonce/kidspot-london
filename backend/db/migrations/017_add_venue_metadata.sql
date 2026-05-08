-- Migration 017: Add metadata columns to venues table
-- Description: Adds address, postcode, phone, and website columns to venues table for persistent storage of enriched data.

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Create indexes for metadata search
CREATE INDEX IF NOT EXISTS idx_venues_postcode ON venues(postcode);

-- Update search_venues_by_radius to include metadata if needed
-- (Skipping for now as the return type is already quite large and we fetch details separately)
