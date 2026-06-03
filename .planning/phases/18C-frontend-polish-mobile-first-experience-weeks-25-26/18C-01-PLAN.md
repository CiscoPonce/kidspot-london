---
phase: 18C-frontend-polish-mobile-first-experience-weeks-25-26
plan: 01
type: execute
wave: 1
depends_on: [18D-party-data-extraction-weeks-25-26]
files_modified:
  - frontend/src/app/layout.tsx
  - frontend/src/app/page.tsx
  - frontend/src/app/globals.css
  - frontend/src/app/manifest.ts
  - frontend/src/app/saved/page.tsx
  - frontend/src/app/shortlist/page.tsx
  - frontend/src/components/layout/hero.tsx
  - frontend/src/components/layout/quick-filters.tsx
  - frontend/src/components/layout/bottom-nav.tsx
  - frontend/src/components/venues/venue-card.tsx
  - frontend/src/components/venues/venue-list.tsx
  - frontend/src/components/venues/venue-detail-content.tsx
  - frontend/src/components/venues/compare-table.tsx
  - frontend/src/components/map/venue-map.tsx
  - frontend/src/components/modals/venue-detail-modal.tsx
  - frontend/src/hooks/use-search.tsx
  - frontend/src/hooks/use-shortlist.ts
  - frontend/src/hooks/use-preferences.ts
  - frontend/src/lib/opening-hours.ts
  - frontend/src/lib/trust.ts
  - frontend/src/lib/shortlist-link.ts
  - frontend/src/lib/api.ts
autonomous: true
requirements:
  - FE-01
  - FE-02
  - FE-03
  - FE-04
  - FE-05
  - FE-06
  - FE-07
  - FE-08
  - FE-09
  - FE-10
  - FE-11
  - FE-12
  - FE-13
user_setup:
  - "Provide maskable PWA icons (192px, 512px) in frontend/public/ or approve generated placeholders"
  - "Phase 18D (party data: capability, price, capacity, enquiry link) should run FIRST or in parallel — 18C cards/compare degrade honestly until 18D coverage lands"
must_haves:
  truths:
    - "Landing leads with the party intent (birthday/reunion) with party-capable categories foregrounded; one-tap geolocation runs search on grant, postcode is the fallback"
    - "Cards are category-aware and party-first: party-capable venues lead with hosts-parties + £/child + capacity + age + Enquire/Call; parks render Free + features + map; never a blank card"
    - "The full party flow works locally with no auth: save -> compare side-by-side -> share an encoded link that rehydrates the shortlist"
    - "The fake isSafeChecked() heuristic is removed; trust signals are verifiable (FHRS, accessibility, owner-verified, source)"
    - "Open-now handles BOTH stored formats (Google/Yelp JSON + OSM strings) and is shown only where data exists"
    - "Category filter has a single canonical source of truth (incl. a party-capable facet); no duplicate or dead controls remain"
    - "viewport exports viewportFit:'cover' and all env(safe-area-inset-*) usages render correctly"
    - "Saved/Shortlist persists across reloads via a localStorage-backed useShortlist hook with an API-ready interface"
    - "Compare view shows shortlisted venues side-by-side (price/child, capacity, age, distance, trust, per-column CTA) with honest '—' where 18D data is absent"
    - "Mobile has a List<->Map segmented control with a full-screen map; MapLibre initializes lazily"
    - "App is installable: manifest + maskable icons + theme-color present and valid"
    - "Children's ages, favourite categories and recent searches persist client-side and influence age-fit"
    - "Venue/hero imagery uses next/image; hero LCP asset is preloaded; icon font no longer flashes raw ligatures"
    - "Venue list is virtualized or incrementally paginated on mobile"
    - "Detail modal traps focus and restores it on close; quick-filter chips meet WCAG AA contrast"
  artifacts:
    - path: "frontend/src/lib/opening-hours.ts"
      provides: "isOpenNow(opening_hours) handling Google/Yelp JSON objects AND OSM strings"
      exports: ["isOpenNow"]
    - path: "frontend/src/lib/trust.ts"
      provides: "Verifiable trust signals (FHRS, accessibility, owner-verified, source) — no rating-based guessing"
      exports: ["trustSignals"]
    - path: "frontend/src/hooks/use-shortlist.ts"
      provides: "useShortlist() add/remove/list/has + count, localStorage-backed, API-ready"
      exports: ["useShortlist"]
    - path: "frontend/src/hooks/use-preferences.ts"
      provides: "usePreferences() for kids' ages, favourite categories, recent searches"
      exports: ["usePreferences"]
    - path: "frontend/src/app/manifest.ts"
      provides: "Valid installable web app manifest"
      exports: ["default"]
    - path: "frontend/src/components/venues/venue-card.tsx"
      provides: "Category-aware, party-first card with honest empty states, verifiable trust, Enquire/Call CTA, persistent save"
      contains: ["trustSignals", "useShortlist", "tel:"]
    - path: "frontend/src/components/venues/compare-table.tsx"
      provides: "Side-by-side comparison of shortlisted party venues (price/child, capacity, age, distance, trust, per-column CTA)"
      exports: ["CompareTable"]
    - path: "frontend/src/lib/shortlist-link.ts"
      provides: "Encode/decode a shortlist to/from a shareable URL (no backend)"
      exports: ["encodeShortlist", "decodeShortlist"]
    - path: "frontend/src/app/shortlist/page.tsx"
      provides: "Read-only shared shortlist view that rehydrates from an encoded link and offers save-locally"
      exports: ["default"]
  key_links:
    - from: "frontend/src/components/venues/venue-card.tsx"
      to: "frontend/src/lib/trust.ts"
      via: "card renders only verifiable trust signals (no isSafeChecked heuristic)"
      pattern: "trustSignals"
    - from: "frontend/src/components/venues/venue-card.tsx"
      to: "frontend/src/lib/opening-hours.ts"
      via: "open-now computed from either hours format"
      pattern: "isOpenNow"
    - from: "frontend/src/components/venues/venue-card.tsx"
      to: "frontend/src/hooks/use-shortlist.ts"
      via: "save toggle persists through useShortlist"
      pattern: "useShortlist"
    - from: "frontend/src/app/saved/page.tsx"
      to: "frontend/src/hooks/use-shortlist.ts"
      via: "Saved/Shortlist tab renders the persisted shortlist + compare entry point"
      pattern: "useShortlist"
    - from: "frontend/src/components/venues/compare-table.tsx"
      to: "frontend/src/hooks/use-shortlist.ts"
      via: "compare view reads the shortlisted venues"
      pattern: "useShortlist"
    - from: "frontend/src/app/shortlist/page.tsx"
      to: "frontend/src/lib/shortlist-link.ts"
      via: "shared link is decoded to rehydrate a read-only shortlist"
      pattern: "decodeShortlist"
---

<purpose>
Rebuild KidSpot London's frontend around its PRIMARY job — helping a parent find and book
a venue for a child's birthday party or family reunion — mobile-first and honest about its
data. Lead with the party intent; render category-aware, party-first cards (party-capable
venues → hosts-parties + £/child + capacity + age + Enquire/Call; parks → free + features +
map as a free-outdoor-party option); replace the fabricated "Safe-checked" badge with
verifiable trust; and ship the hero party flow LOCALLY (no auth): save -> compare
side-by-side -> share an encoded link. Server-backed persistence + accounts are Phase 19.
This phase DEPENDS ON Phase 18D (party data: capability/price/capacity/enquiry link); where
18D coverage is absent, the UI degrades to contact-to-enquire, never to a blank card.
</purpose>

<sequencing>
Ship in order of value to the party job; no release exposes blank cards:
- Wave 1 lands the party-first, category-aware card + verifiable trust + party-intent
  geolocation search — where 18D party data (or, until then, tap-to-call) shines.
- Wave 2 lands the HERO flow: Party Shortlist -> Compare -> Share (all local/no-auth).
- Waves 3-4 add app-shell, personalization, performance and accessibility hardening.
Party-capable venues lead; parks degrade gracefully to map/features-first.
</sequencing>

<tasks>

  <task>
    <name>Wave 1 — Party-first core: category-aware cards, real trust, party-intent search, safe areas</name>
    <requirements>FE-01, FE-02, FE-03, FE-11</requirements>
    <steps>
      1. lib/api.ts: expose fields the UI needs — `fhrs_establishment_id`, `features`, `parent_facets`, `source`, `claimed_at`, `booking_url`, `images`, plus the Phase 18D party fields (`party_capable`, `party_price_from`, `party_price_unit`, `party_max_capacity`, `party_enquiry_url`) — on the Venue type. All optional/nullable so cards degrade honestly before 18D lands.
      2. Create lib/trust.ts `trustSignals(venue)` returning ONLY verifiable signals (FHRS hygiene, accessibility from features, owner-verified from claimed_at, data source). Delete the rating-based isSafeChecked() heuristic from venue-card.tsx.
      3. Create lib/opening-hours.ts `isOpenNow(opening_hours)` that parses BOTH the Google/Yelp JSON object form and the OSM string form (Mo-Fr 09:30-17:00); returns open/closed/unknown.
      4. Refactor venue-card.tsx to be category-aware and PARTY-FIRST: party-capable (softplay/party hall/leisure_centre) → "Hosts parties" badge + £/child + capacity + age fit (where 18D present) + primary CTA Enquire/Call (tel:), Book only when booking_url exists; community_hall → capacity/area + Call/Website/Directions (enquiry-led); park → Free + features + map/Directions framed as free-outdoor-party, no price/photo placeholder; library/museum/café → facts + contact. Universal: distance, borough, add-to-shortlist, open-now where present. Honest empty states everywhere — never a blank card.
      5. hero.tsx: lead with the party intent copy ("Find a venue for your child's birthday or a family reunion") with party-capable categories foregrounded; one-tap geolocation primary action (run search on grant); collapse to one expandable pill; remove the dead age <select>.
      6. Unify category filter to one source of truth in use-search (incl. a "party-capable" facet); remove the duplicate hero category control. layout.tsx: add viewportFit:'cover' + themeColor; audit safe-area usages. Remove dead .map-container CSS in globals.css.
    </steps>
    <verify>
      <automated>
        cd frontend && npx tsc --noEmit
        bash -c 'grep -c "isSafeChecked" src/components/venues/venue-card.tsx | xargs -I{} test {} -eq 0 && echo PASS_NO_FAKE_TRUST || echo FAIL_NO_FAKE_TRUST'
        bash -c 'grep -c "trustSignals" src/lib/trust.ts src/components/venues/venue-card.tsx | awk -F: "{s+=\$2} END {print (s>=2)?\"PASS_TRUST\":\"FAIL_TRUST\"}"'
        bash -c 'grep -c "isOpenNow" src/lib/opening-hours.ts | xargs -I{} test {} -ge 1 && echo PASS_HOURS || echo FAIL_HOURS'
        bash -c 'grep -Ec "tel:|Enquire" src/components/venues/venue-card.tsx | xargs -I{} test {} -ge 1 && echo PASS_ENQUIRE || echo FAIL_ENQUIRE'
        bash -c 'grep -c "viewportFit" src/app/layout.tsx | xargs -I{} test {} -ge 1 && echo PASS_SAFEAREA || echo FAIL_SAFEAREA'
        bash -c 'grep -c "map-container" src/app/globals.css | xargs -I{} test {} -eq 0 && echo PASS_DEADCSS || echo FAIL_DEADCSS'
      </automated>
      <manual>
        Search softplay/party-capable: cards lead with hosts-parties + £/child + capacity + age + Enquire/Call (Book only where booking_url exists). Search a park-heavy area: park cards show Free + features + Directions framed as free-outdoor-party, NO blank photo/price slots. No card renders fully empty. No fabricated "Safe-checked" appears.
      </manual>
    </verify>
    <done>Party-first category-aware cards with honest empty states; verifiable trust replaces the heuristic; open-now parses both formats; party-intent geolocation search; one canonical filter incl. party facet; viewportFit cover; dead CSS gone; typecheck clean.</done>
  </task>

  <task>
    <name>Wave 2 — HERO flow: Party Shortlist + Compare + Share (local/no-auth)</name>
    <requirements>FE-04, FE-12, FE-13</requirements>
    <steps>
      1. Create hooks/use-shortlist.ts: localStorage-backed add/remove/has/list + count, typed so a Phase 19 API can replace storage without changing call sites. Wire venue-card add-to-shortlist to it (replace local useState).
      2. Rebuild saved/page.tsx as the Shortlist tab: list saved venues with a personable empty state + a "Compare" entry point; add a count badge to the Saved item in bottom-nav.tsx.
      3. FE-12 Compare: create components/venues/compare-table.tsx rendering shortlisted venues side-by-side (column-per-venue desktop / horizontally-scrollable mobile): £/child, capacity, age fit, distance, hours, trust signals, per-column Enquire/Call/Book CTA. Show honest "—" where 18D data is absent.
      4. FE-13 Share: create lib/shortlist-link.ts (encodeShortlist/decodeShortlist over venue ids/slugs into a URL); add a Share action (Web Share API + copy-link fallback) on the Shortlist tab; create app/shortlist/page.tsx that decodes ?v= into a READ-ONLY shortlist with a "save these locally" action.
    </steps>
    <verify>
      <automated>
        cd frontend && npx tsc --noEmit
        bash -c 'grep -c "useShortlist" src/hooks/use-shortlist.ts src/components/venues/venue-card.tsx src/app/saved/page.tsx | awk -F: "{s+=\$2} END {print (s>=3)?\"PASS_SHORTLIST\":\"FAIL_SHORTLIST\"}"'
        bash -c 'grep -ci "localStorage" src/hooks/use-shortlist.ts | xargs -I{} test {} -ge 1 && echo PASS_PERSIST || echo FAIL_PERSIST'
        bash -c 'grep -Ec "encodeShortlist|decodeShortlist" src/lib/shortlist-link.ts | xargs -I{} test {} -ge 2 && echo PASS_SHARE || echo FAIL_SHARE'
        bash -c 'test -f src/components/venues/compare-table.tsx && test -f src/app/shortlist/page.tsx && echo PASS_COMPARE_SHARE_FILES || echo FAIL_COMPARE_SHARE_FILES'
      </automated>
      <manual>
        Save 3 venues; open Shortlist; Compare shows them side-by-side with price/child, capacity, age, distance, trust, and a CTA per column ("—" where data absent). Share copies/opens a link; opening it in a fresh session rehydrates the same 3 read-only and offers save-locally. All works with no login.
      </manual>
    </verify>
    <done>The hero party flow works end-to-end locally: save persists across reloads, compare renders side-by-side with honest gaps, share encodes/decodes a no-auth link; count badge on Shortlist tab.</done>
  </task>

  <task>
    <name>Wave 3 — App-like shell: full-screen mobile map, lazy MapLibre, PWA, personalization</name>
    <requirements>FE-05, FE-06, FE-07</requirements>
    <steps>
      1. page.tsx: mobile List<->Map segmented control opening a full-screen map; replace the fixed h-[420px] block + scroll-only pill; lazy-init MapLibre when the map opens. (Map is the primary surface for parks — 52% of inventory.)
      2. venue-map.tsx: larger touch radius for unclustered points + "recenter to me".
      3. Create app/manifest.ts (theme-color #fff9e6, display standalone, maskable icons); add icons to public/. Minimal offline shell (frame + local Saved).
      4. Create hooks/use-preferences.ts (kids' ages, favourite categories, recent searches); one-time "set children's ages" feeds age-fit (FE-02) + ordering.
    </steps>
    <verify>
      <automated>
        cd frontend && npx tsc --noEmit
        bash -c 'test -f src/app/manifest.ts && echo PASS_MANIFEST || echo FAIL_MANIFEST'
        bash -c 'grep -c "usePreferences" src/hooks/use-preferences.ts | xargs -I{} test {} -ge 1 && echo PASS_PREFS || echo FAIL_PREFS'
        cd frontend && npm run build 2>&1 | tail -5
      </automated>
    </verify>
    <done>Segmented List/Map with full-screen map + lazy MapLibre; manifest + icons present and build succeeds; preferences persist and drive age-fit.</done>
  </task>

  <task>
    <name>Wave 4 — Performance, virtualization & accessibility</name>
    <requirements>FE-08, FE-09, FE-10</requirements>
    <steps>
      1. Migrate venue-card.tsx + hero.tsx imagery to next/image with explicit sizes; preload hero LCP asset; adjust next.config.js images.
      2. layout.tsx: preload/self-host Material Symbols with font-display to remove the ligature FOUT.
      3. venue-list.tsx: virtualize/paginate on mobile.
      4. venue-detail-modal.tsx: focus trap + restore; keyboard-accessible list equivalent for map results; fix quick-filter chip contrast to AA.
    </steps>
    <verify>
      <automated>
        cd frontend && npx tsc --noEmit
        bash -c 'grep -c "next/image" src/components/venues/venue-card.tsx | xargs -I{} test {} -ge 1 && echo PASS_IMAGE || echo FAIL_IMAGE'
        cd frontend && npm run build 2>&1 | tail -5
      </automated>
      <manual>
        Lighthouse (mobile) on the deployed build: Perf >=90, A11y >=95, PWA installable; LCP <2.5s, CLS <0.1; zero horizontal scroll at 320px.
      </manual>
    </verify>
    <done>Images via next/image (no CLS); icon font no flash; list virtualized; modal focus-trapped; chips pass AA; Lighthouse targets met.</done>
  </task>

</tasks>

<verification>
```bash
cd frontend
npx tsc --noEmit
npm run build

# FE-11 real trust (no fake heuristic)
grep -c "isSafeChecked" src/components/venues/venue-card.tsx | xargs -I{} test {} -eq 0
grep -c "trustSignals" src/lib/trust.ts | xargs -I{} test {} -ge 1

# FE-02 open-now handles both formats + actionable contact
grep -c "isOpenNow" src/lib/opening-hours.ts | xargs -I{} test {} -ge 1
grep -c "tel:" src/components/venues/venue-card.tsx | xargs -I{} test {} -ge 1

# FE-03 safe areas + dead CSS
grep -c "viewportFit" src/app/layout.tsx | xargs -I{} test {} -ge 1
grep -c "map-container" src/app/globals.css | xargs -I{} test {} -eq 0

# FE-04 persistent shortlist
grep -c "useShortlist" src/components/venues/venue-card.tsx src/app/saved/page.tsx | awk -F: '{s+=$2} END {exit (s>=2)?0:1}'

# FE-12 compare + FE-13 share (local/no-auth)
test -f src/components/venues/compare-table.tsx
test -f src/app/shortlist/page.tsx
grep -Ec "encodeShortlist|decodeShortlist" src/lib/shortlist-link.ts | xargs -I{} test {} -ge 2

# FE-06 PWA / FE-07 prefs / FE-08 images
test -f src/app/manifest.ts
grep -c "usePreferences" src/hooks/use-preferences.ts | xargs -I{} test {} -ge 1
grep -c "next/image" src/components/venues/venue-card.tsx | xargs -I{} test {} -ge 1
```
</verification>

<success_criteria>
- PARTY OUTCOME (via Plausible SearchPerformed/VenueSelected/VenueViewed/VenueSaved + new ShortlistCompared/ShortlistShared/PartyEnquiryClicked): measurable party-enquiry/call/booking click-through on party-capable venues; non-zero shortlist creation, compare, and share usage.
- The hero party flow (search -> shortlist -> compare -> share/enquire) is completable on mobile in a few taps, with no login.
- No blank cards: party-capable venues lead with hosts-parties/£-per-child/capacity/age/Enquire-Call; parks render map/features-first (free-outdoor-party); honest "—" everywhere data is absent.
- No fabricated trust: isSafeChecked() removed; only verifiable signals (FHRS, accessibility, owner-verified, source) shown.
- Open-now correct for BOTH stored hours formats; shown only where data exists.
- Party-intent landing runs search on location grant without manual postcode; single canonical category filter incl. party facet; safe-area insets correct on notched devices.
- Technical guardrails: Lighthouse mobile Perf >=90 / A11y >=95; LCP <2.5s on 4G; CLS <0.1; zero horizontal scroll at 320px; installable PWA; tsc --noEmit and npm run build pass.
</success_criteria>

<output>
Create `.planning/phases/18C-frontend-polish-mobile-first-experience-weeks-25-26/18C-01-SUMMARY.md` when done.
DEPENDS ON Phase 18D (party data) — note in STATE.md which 18D fields are live so card/compare coverage is tracked honestly.
</output>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Browser localStorage <-> app | Shortlist + preferences are client-only; non-authoritative |
| App <-> external deep links | tel:, maps, booking_url, website navigate to third-party targets |
| App <-> service worker cache | Offline shell caches static frame; must not cache stale/sensitive API data |
| Displayed trust signals <-> source data | FHRS/accessibility/owner-verified must reflect real fields, never be inferred |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-18C-01 | Tampering | localStorage shortlist/preferences | accept | Client-only convenience; validate on read; no security decisions depend on it |
| T-18C-02 | Spoofing | Outbound venue/tel/booking links | mitigate | Render only from validated venue fields; rel="noopener noreferrer" on external links |
| T-18C-03 | Information Disclosure | Service worker cache | mitigate | Cache only static shell + public assets; never per-user/authenticated responses |
| T-18C-04 | Repudiation/Integrity | Trust signals (FHRS/verified) | mitigate | trust.ts derives signals ONLY from real fields; absent data shows "not verified", never inferred from rating |
| T-18C-05 | Denial of Service | MapLibre on low-end devices | mitigate | Lazy-init on open; existing WebGL MapFallback |
| T-18C-06 | Tampering/Injection | Shared shortlist link (?v=) | mitigate | Decode to ids only; validate each id against the venue API before render; cap list length; render shared view read-only; no script/markup from the URL is ever interpreted |
| T-18C-SC | Tampering | npm installs (next/image, virtualization) | accept | Pin versions; prefer built-in Next/React before adding deps |
</threat_model>
