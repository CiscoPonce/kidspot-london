-- Migration 022: Add opening_hours and images columns to venues table
-- Description: Adds JSONB opening_hours and TEXT[] images for Apify rich data.

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS images TEXT[];
