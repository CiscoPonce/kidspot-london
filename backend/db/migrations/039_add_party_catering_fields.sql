-- Migration 039: Add party catering, BYO food, cake policy, and kitchen facilities
-- Description: Supports Phase 26 party catering transparency and BYO cake reassurance

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS byo_food_allowed BOOLEAN,
  ADD COLUMN IF NOT EXISTS food_provided BOOLEAN,
  ADD COLUMN IF NOT EXISTS kitchen_facilities BOOLEAN,
  ADD COLUMN IF NOT EXISTS catering_notes TEXT;

-- Initial intelligent defaults for active core venues
-- Community halls are overwhelmingly self-catered with kitchen access
UPDATE venues
SET 
  byo_food_allowed = COALESCE(byo_food_allowed, TRUE),
  kitchen_facilities = COALESCE(kitchen_facilities, TRUE),
  food_provided = COALESCE(food_provided, FALSE)
WHERE type = 'community_hall' AND is_active = TRUE;

-- Softplay centres typically include in-house hot/cold food packages and disallow outside hot food
UPDATE venues
SET 
  byo_food_allowed = COALESCE(byo_food_allowed, FALSE),
  food_provided = COALESCE(food_provided, TRUE),
  kitchen_facilities = COALESCE(kitchen_facilities, FALSE)
WHERE type = 'softplay' AND is_active = TRUE;
