-- Phase 19: Venue scope classification
-- Reversible curation layer: tag every venue as core / secondary / review / excluded
-- so the product can foreground real party-hire venues without deleting data.
--
--   core      = strong party-hire fit (softplay, halls, party-confirmed, leisure w/ kids signal)
--   secondary = parks / free outdoor reunion spots (separate UI lane)
--   review    = plausible but unconfirmed (generic leisure centres, misc 'other')
--   excluded  = noise (adult gyms, retail, clinics, worship-only, classes, junk)
--
-- scope_reason records WHICH rule fired, for auditing and easy reversal.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_scope TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS scope_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_venue_scope') THEN
    ALTER TABLE venues
      ADD CONSTRAINT chk_venue_scope
      CHECK (venue_scope IS NULL OR venue_scope IN ('core','secondary','review','excluded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_venues_scope ON venues (venue_scope) WHERE is_active;
