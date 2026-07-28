-- Migration 037: Add contact_enriched_at (referenced by migration 021 index but never created)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_venues_contact_enriched_at
  ON venues(contact_enriched_at)
  WHERE contact_enriched_at IS NULL AND is_active = TRUE;
