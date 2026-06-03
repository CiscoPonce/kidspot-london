-- Phase 18D: Party Data Extraction
-- Adds party-specific fields the party-planning product needs: capability,
-- price-per-child, capacity, package names, and an enquiry/booking link.
-- All columns are nullable so the frontend (18C) degrades honestly before backfill.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_capable BOOLEAN;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_price_from NUMERIC(8,2);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_price_unit TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_max_capacity INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_packages JSONB;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_enquiry_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_source TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS party_extracted_at TIMESTAMPTZ;

-- Constrain the price unit to the known vocabulary (idempotent guard).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_party_price_unit') THEN
    ALTER TABLE venues
      ADD CONSTRAINT chk_party_price_unit
      CHECK (party_price_unit IS NULL OR party_price_unit IN ('per_child', 'per_hour', 'flat'));
  END IF;
END $$;

-- Partial index for "party-capable" filtering (FE-03 facet) and the re-crawl scheduler.
CREATE INDEX IF NOT EXISTS idx_venues_party_capable ON venues (party_capable) WHERE party_capable IS TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_party_extracted_at ON venues (party_extracted_at);
