# Next Actions: Phase 11 — Search Experience V2

Phase 8.5, 9, and 10 are **100% complete**.

## Recently landed (May 4, 2026)

- **Phase 11 plan** — `.planning/phases/11-search-experience-v2/11-CONTEXT.md`
  (objectives, success criteria, two implementation waves, risks, demo).
- **Frontend redesign (Wave 1 + 2)** — multi-color filter chips
  (Soft Play / Parks / Museums / Party Rooms / Libraries), image-top venue
  cards with heart + Safe-checked + price, 50/50 desktop map+results split,
  mobile "View Map" floating pill. Cafés and leisure-centres / pools removed
  from every user-facing surface.
- **Material Symbols icon font fix** — moved to a real `<link>` in
  `app/layout.tsx` (Turbopack was dropping the CSS `@import`).
- **Search quality** — Brave fallback is now gated on `DB + OSM === 0`,
  with a listicle / aggregator filter even when it does fire. The OSM
  softplay query was broadened to also catch named council leisure centres
  (Atherton, Mile End, etc.) without polluting with adult-only chains.
- **Migration 012** — seeds `Atherton Leisure Centre` (E15 4JF) as a
  soft-play venue so E15 users see a close, verified result regardless of
  Overpass health.

## Upcoming (Phase 11.5 / 12 candidates)

1. **Promote Safe-checked to a column** — replace the heuristic
   (`sponsor` ∨ `rating ≥ 4` ∨ `borough ∧ phone/website`) with an explicit
   boolean populated by an enrichment pass.
2. **Backfill OSM venue names** — ~9.8 k venues currently named
   `OSM <id>`; run a batch enrichment via Yelp / Brave to give them real
   names before they're shown.
3. **De-dupe pass** — visible duplicates such as `Cookie's Island` × 2
   slipped past `insert_venue_if_not_duplicate`. Tighten the function.
4. **Council leisure-centre directory** — current
   `source = 'leisure-centres'` rows are actually arts centres mislabelled.
   Replace with a real GLL / Better / Everyone Active scrape.
5. **Multi-city expansion** — start scoping Manchester / Birmingham as a
   second deployable region once Phase 11 metrics confirm London is solid.

## Verification commands

```bash
# Confirm v2 search works for the canonical E15 4GH soft-play test
curl -s "http://localhost:4000/api/search/venues?lat=51.54297&lon=0.012152&radius=5&type=softplay&limit=24" \
  | jq '.data.regular.venues[] | {source, name, distance_miles}' | head -30

# Phase 11 plan
cat .planning/phases/11-search-experience-v2/11-CONTEXT.md

# Health
curl http://localhost:4000/ready
```
