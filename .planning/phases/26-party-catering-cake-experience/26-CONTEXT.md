# Phase 26: Party Catering, Cake Policies & Parent Planning Essentials — Context

**Goal:** Answer the #1 practical question parents have when booking a children's party in London: **"What is the food policy, can we bring our own cake, and what else do we need to organize?"**

**Status:** 📋 Planning / Active  
**Depends on:** Phase 24 (Frontend Redesign & Booking Flow), Phase 18D (Party Data Extraction)  
**Parent / Tester Insight:** *"Most venues either provide set food packages or allow self-catering, but almost ZERO venues provide the birthday cake. Parents must bring their own cake, candles, and party bags."*

---

## 🎯 Product Problem & Parent Psychology

When parents evaluate venues on KidSpot, they need immediate clarity on three catering dimensions:

1. **The Birthday Cake Rule**:
   * Venues (even all-inclusive soft play centres) virtually **never supply the birthday cake**.
   * Parents need explicit reassurance that bringing their own birthday cake, candles, and napkins is welcome.

2. **Catering & BYO Policy**:
   * **Community & Church Halls**: Usually 100% Self-Catered / Bring-Your-Own (BYO) food. Parents need to know if there is a **kitchen, fridge, microwave, or boiling urn** for tea/coffee for attending parents.
   * **Soft Play & Trampoline Parks**: Almost always offer **in-house food packages** (pizza, chicken nuggets, juice boxes) and prohibit outside hot food.
   * **Museums & Leisure Centres**: Usually offer a cafe package or a dry hire room where parents bring party snacks.

3. **Party Planning Mental Load**:
   * Once parents find a venue, they need a simple, zero-friction checklist to track the rest of the party: Cake, party bags, decorations, and parent tea/coffee supplies.

---

## 📦 Phase 26 Deliverables

### 1. Data Model & Extraction (`26-01`)
* **DB Migration**: Add `byo_food_allowed`, `food_provided`, `kitchen_facilities`, and `catering_notes` to `venues` table.
* **Extraction Engine**: Extend `partyExtraction.ts` with regex and LLM patterns to classify venue catering rules and kitchen amenities during automated crawls.

### 2. UI Badges & Policy Transparency (`26-02`)
* Add visual **"Food & Cake Policy"** section to `venue-card.tsx` and `venue-detail-content.tsx`:
  * 🎂 **Birthday Cake**: `Bring your own cake & candles welcome`
  * 🥪 **Food Rule**: `Self-Catering / BYO Food Allowed` vs `In-House Food Included`
  * ☕ **Kitchen Access**: `Kitchen & Fridge Access Available` (for halls)

### 3. Interactive Parent Party Checklist (`26-03`)
* Embed a persistent, interactive **Party Checklist** widget in `/shortlist`, `/saved`, and `/booking/confirmation`:
  * [ ] 📍 Venue booked & deposit paid
  * [ ] 🎂 Birthday cake & candles ordered
  * [ ] 🥪 Food & drinks planned (checked venue BYO rules)
  * [ ] 🎈 Party bags, invitations & decorations
  * [ ] ☕ Tea/coffee supplies for attending parents (if hiring a hall)

### 4. Local Cake & Party Supplies Partner Hook (`26-04`)
* Contextual banner in venue detail pages and shortlist: *"Need a bespoke cake or entertainer in [Borough]?"* — laying the foundation for future local baker/entertainer sponsor monetization.
