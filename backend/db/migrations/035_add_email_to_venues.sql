-- Migration 035: Add email to venues
-- Description: Adds email column to the venues table for contact information.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS email TEXT;