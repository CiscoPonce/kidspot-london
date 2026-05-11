-- Migration 021: Phase 15 — Data Quality & Contact Enrichment Foundation
-- 1. Soft-delete unnamed OSM venues (stored as "OSM 12345678")
-- 2. Soft-delete venues outside Greater London bounding box
-- 3. Soft-delete venues with zero coordinates
-- 4. Add description and opening_hours columns
-- 5. Add index for contact enrichment tracking

-- ──────────────────────────────────────────────────
-- 1) Soft-delete unnamed OSM venues
-- ──────────────────────────────────────────────────
UPDATE venues
SET is_active = FALSE
WHERE source = 'osm'
  AND name ~* '^OSM [0-9]+$'
  AND is_active = TRUE;

-- ──────────────────────────────────────────────────
-- 2) Soft-delete venues outside Greater London
--    Bounding box: lat 51.28–51.70, lon -0.51–0.33
-- ──────────────────────────────────────────────────
UPDATE venues
SET is_active = FALSE
WHERE is_active = TRUE
  AND (lat < 51.28 OR lat > 51.70 OR lon < -0.51 OR lon > 0.33);

-- ──────────────────────────────────────────────────
-- 3) Soft-delete venues with zero coordinates
-- ──────────────────────────────────────────────────
UPDATE venues
SET is_active = FALSE
WHERE is_active = TRUE
  AND (lat = 0 OR lon = 0);

-- ──────────────────────────────────────────────────
-- 4) Add new columns for richer venue data
-- ──────────────────────────────────────────────────
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS opening_hours TEXT;

-- ──────────────────────────────────────────────────
-- 5) Add indexes for enrichment tracking
-- ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_venues_contact_enriched_at
  ON venues(contact_enriched_at)
  WHERE contact_enriched_at IS NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_venues_source_active
  ON venues(source)
  WHERE is_active = TRUE;
