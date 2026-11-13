-- Several enrichers write venues.updated_at; the column was never added.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE venues
SET updated_at = COALESCE(last_scraped, enriched_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_venues_updated_at ON venues (updated_at DESC);
