# Phase 26: Party Catering, Cake Policies & Parent Planning Essentials — Implementation Plan

**Goal:** Equip parents with crystal-clear food and birthday cake policies for every London venue, alongside an interactive party planning checklist.

---

## 🛠 Tasks Breakdown

### Task 1: Database Migration & Backend Schema (`26-01`)
* Create `backend/db/migrations/039_add_party_catering_fields.sql`:
  ```sql
  ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS byo_food_allowed BOOLEAN,
    ADD COLUMN IF NOT EXISTS food_provided BOOLEAN,
    ADD COLUMN IF NOT EXISTS kitchen_facilities BOOLEAN,
    ADD COLUMN IF NOT EXISTS catering_notes TEXT;
  ```
* Update `venueService.ts` and `types/venue.ts` to return catering attributes in `Venue` and `VenueDetails`.

### Task 2: Catering & Kitchen Extraction Mining (`26-02`)
* Extend `backend/src/utils/partyExtraction.ts`:
  * Add regex detection for BYO food (`bring your own food`, `self-catering`, `external caterers welcome`).
  * Add regex detection for in-house food (`hot food included`, `party food boxes`, `unlimited squash`).
  * Add regex detection for kitchen facilities (`kitchen access`, `microwave`, `fridge`, `hot water urn`, `servery`).
* Add default heuristic mappings based on venue type:
  * `community_hall` → Default `byo_food_allowed: true`, `food_provided: false`, `kitchen_facilities: true`.
  * `softplay` → Default `byo_food_allowed: false`, `food_provided: true`, `kitchen_facilities: false`.
  * All venues → Default `cake_policy: "Bring your own birthday cake & candles welcome"`.

### Task 3: Frontend UI Badges & Policy Component (`26-03`)
* Update `frontend/src/lib/api.ts` with new fields on `Venue` and `VenueDetails`.
* Create `frontend/src/components/venues/party-catering-badge.tsx`:
  * 🎂 "BYO Cake & Candles Welcome" (always visible on party-capable venues)
  * 🥪 "BYO Food Allowed" or "Food Package Included"
  * ☕ "Kitchen & Fridge Access Available" (for halls)
* Embed into `venue-card.tsx` and `venue-detail-content.tsx`.

### Task 4: Interactive Parent Party Planning Checklist (`26-04`)
* Create `frontend/src/components/venues/party-checklist.tsx` with localStorage persistence:
  * [ ] 📍 Venue booked & date secured
  * [ ] 🎂 Birthday cake & candles ordered (remember venues don't supply!)
  * [ ] 🥪 Food & drinks sorted (check venue BYO rules)
  * [ ] 🎈 Party bags, invitations & decorations
  * [ ] ☕ Tea/coffee & snacks for accompanying parents
* Integrate into `/shortlist`, `/saved`, and `/booking/confirmation`.

---

## 🧪 Testing & Verification

1. **Unit Tests**: Add tests in `backend/src/tests/unit/partyExtraction.test.ts` for catering & kitchen regex signals.
2. **UI Verification**: Validate rendering in `venue-card.tsx`, `venue-detail-content.tsx`, `/saved`, and `/shortlist`.
3. **Smoke Test**: Re-run `scripts/smoke-test-all.sh` to ensure all API and frontend routes return 200 OK.
