ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS website_images_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS brave_images_attempted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_venues_website_images_attempted
  ON venues (website_images_attempted_at NULLS FIRST)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_venues_brave_images_attempted
  ON venues (brave_images_attempted_at NULLS FIRST)
  WHERE is_active = TRUE;
