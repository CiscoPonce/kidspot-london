-- Migration 036: Add booking_url to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_url TEXT;
