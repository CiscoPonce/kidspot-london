# Phase 18C: Party-First Frontend & Mobile-First Experience

## Domain

KidSpot's **primary job** is helping a parent find and book a place for a **child's
birthday party or a family reunion**. Everything else (general "things to do near me")
is secondary discovery that supports that job. Phase 18C rebuilds the frontend around
that party-planning flow — mobile-first, evidence-led, and honest about the data behind
each venue category.

Phase 18C is **frontend-only** but **party-first**:

- The **Party Shortlist** (save → **compare** → **share a link**) is the hero feature of
  this phase, built **locally (no auth)**: shortlist in `localStorage`, share via an
  encoded URL. Account-backed persistence, owner auth, and server sync defer to **Phase 19**.
- 18C **depends on Phase 18D** (Party Data Extraction) for the decision-critical fields
  (party capability, price-per-child, capacity, enquiry/booking link). Where 18D data is
  absent, the UI degrades honestly (contact-to-enquire), never to a blank card.

## Data Reality (the evidence that shapes this phase)

Coverage across 14,676 active venues (measured 2026-06-03):

| Type | Count | % of site | Image | Price | Hours | Rating | Phone | Website | Booking |
|------|------:|----------:|------:|------:|------:|-------:|------:|--------:|--------:|
| park | 7,666 | 52% | 0% | 0% | 3% | 0% | — | — | 0% |
| leisure_centre | 4,172 | 28% | 3% | 0% | 8% | 4% | 72% | 92% | 0% |
| community_hall | 1,551 | 11% | 0% | 1% | 3% | 13% | 7% | 20% | 0% |
| other | 926 | 6% | 1% | 16% | 1% | 42% | — | — | 0% |
| softplay | 321 | 2% | 47% | 0% | 15% | 29% | 96% | 100% | 0% |
| museum | 20 | — | 5% | 0% | 5% | 25% | 90% | 90% | 0% |
| cafe | 10 | — | 0% | 50% | 0% | 90% | 0% | 10% | 0% |
| library | 10 | — | 0% | 0% | 0% | 70% | — | — | 0% |

**Implications (binding constraints on the design):**

1. **The party job has almost no supporting data today.** Across the party-capable
   categories (softplay, community/party halls, leisure centres, museums, cafés) there is
   **0% booking/enquiry links, ~0% party pricing, and no party-capability flag at all**
   (softplay `features` are empty `[]`; only 33 of 14,676 venues mention "party"
   anywhere). A party-finder over venues with no price, no packages, and no way to book is
   a brochure — so **Phase 18D (party data) is sequenced FIRST/parallel** and 18C renders
   what it produces.
2. **Contact data is the conversion lever we already have.** Softplay is 96% phone / 100%
   website and leisure centres 72% / 92% — so today's primary party CTA is
   **"Enquire / Call about a party"** (tap-to-call), with "Book" appearing only where 18D
   finds a real booking link. **Community halls** (the classic party-room rental) are the
   weakest at **7% phone / 20% website** — a data gap routed to 18D.
3. **Parks (52%) are a *secondary* "free outdoor party" option, not the headline.** The
   earlier "own the 7,666-park long tail" thesis was a discovery play, not the party job.
   Parks render map/features-first and remain useful for browsing, but the product leads
   with party-capable venues (~6,000 addressable; ~1,900 softplay + community halls).
4. **"Open now" is low-yield + high-effort:** hours exist for only 3–15% of venues, stored
   in two incompatible formats — Google/Yelp JSON (`{"open":[{"start":"0700",...}]}`) and
   OSM strings (`Mo-Fr 09:30-17:00`). Treat as a softplay/party enhancement, not a global
   chip.
5. **The "Safe-checked" badge is currently fake** (`isSafeChecked()` returns true when
   `rating >= 4`). On a kids' product this is a trust liability and must be replaced with
   verifiable signals (FHRS food hygiene via `fhrs_establishment_id`, accessibility,
   owner-verified, data provenance).

## Product Thesis (the moat)

KidSpot's defensible value is **the party-planning job that general maps don't do** —
not out-Googling Google on the glossy 2% of softplay chains.

- **One place to plan a kids' party / reunion:** filter party-capable venues by age,
  capacity, price and area; **shortlist a few, compare them side by side, and share the
  list** with a partner or co-organiser — a flow Google Maps simply doesn't offer.
- **Kid + party framing on the long tail:** softplay, community/party halls, leisure
  centres with party rooms, museums and cafés that host parties — surfaced with
  age-fit, capacity, price-per-child, and "hosts parties" signals KidSpot extracts.
- **Trust made real:** FHRS hygiene, accessibility, owner verification, transparent data
  sources — not guessed from a star rating.

The frontend's job: make the **party shortlist/compare/share** flow effortless on mobile,
and make sparse data feel *intentional* via category-aware, honest cards.

## Prior Decisions From Earlier Phases

- **Phase 04 / 13**: Next.js 16 (App Router) + React 19 + Tailwind 3.4.7 +
  MapLibre GL 4.5 + TanStack Query; Material Design tokens; Plus Jakarta Sans.
- **Phase 12 (Party Portal)**: multi-facet schema (`parent_facets` array), FHRS
  convergence, OpenActive/operator ingestion — party is already in the data model.
- **Phase 17/18/18B**: venues carry `phone`, `email`, `website`, `booking_url`,
  `opening_hours`, `price_level`, `rating`, `images`, `borough`, `fhrs_establishment_id`,
  `features`, `parent_facets`, `description` — most NOT surfaced or used in ranking.
- **Phase 18B**: browser-grade headers + crawl-delay + **NVIDIA LLM fallback extraction**
  (non-streaming, JSON-robust) — the engine Phase 18D reuses to mine party data.
- **Phase 18D (NEW, run FIRST/parallel)**: extracts party capability, price, capacity, and
  enquiry/booking links — the data spine 18C renders.
- **Phase 19 (PLANNED)**: owner claim/verification + premium sponsorship + **server-backed
  shortlist persistence + accounts**. 18C's local shortlist/compare/share is the bridge.

## Implementation Decisions

### FE-01 — Party-First Landing & Geolocation
- **Problem:** Hero stacks postcode + category + a dead age `<select>` (wired to nothing)
  + Search — tall on mobile, generic ("places for kids"), and gated behind manual entry.
- **Approach:** Lead with the party intent — *"Find a venue for your child's birthday or
  a family reunion"* — with **party-capable categories foregrounded** (softplay, party
  halls, leisure centres). One-tap "Use my location" is the primary mechanic (run search
  on grant); postcode is the fallback. Collapse to a single expandable pill. Remove the
  dead age control (relocated to FE-07 preferences).
- **Refs:** `src/components/layout/hero.tsx`, `src/hooks/use-location.ts`, `src/hooks/use-search.tsx`.

### FE-02 — Category-Aware, Party-First Venue Cards
- **Problem:** Cards assume photo/price/rating, which 80% of venues lack; contact data is
  decorative (icons, not actions). A one-size card exposes empty data and buries the party
  signal.
- **Approach:** Render **per category** what the type actually has, leading with party
  relevance:
  - **softplay / party hall / leisure_centre (party-capable):** "Hosts parties" badge,
    `£ / child` + capacity + age fit (from 18D where present), photo where available, and
    the primary CTA **`Enquire` / `Call` (`tel:`)** — `Book` only when a real `booking_url`
    exists.
  - **community_hall:** capacity + area + **`Call`/`Website`/`Directions`** (enquiry-led,
    since price/booking are usually absent).
  - **park / playground:** `Free` + `features` (playground, open space, accessibility) +
    prominent map/Directions; framed as a **free outdoor party** option; no price/photo
    placeholder.
  - **library / museum / café:** category-appropriate facts + contact/Directions.
  - Universal: distance, borough, actionable `Call`/`Directions`/`Website`; **add-to-shortlist**.
  - **Honest empty states** — never a blank card; show the map/contact value instead.
  - "Open now" computed (handling BOTH hours formats via `lib/opening-hours.ts`), shown
    only where data exists, prioritised for softplay/party.
- **Refs:** `src/components/venues/venue-card.tsx`, `src/lib/api.ts`, `src/components/venues/venue-detail-content.tsx`.

### FE-03 — Unified Filters & Safe-Area Correctness
- **Problem:** Category selection exists twice (hero select + quick-filters chips);
  `layout.tsx` `viewport` omits `viewportFit:'cover'` so `env(safe-area-inset-*)` paddings
  never apply on notched devices; dead `.map-container` CSS in `globals.css`.
- **Approach:** Single canonical filter state in `use-search` (incl. a **"party-capable"**
  facet filter); add `viewportFit:'cover'` + audit safe-area usages; remove dead CSS;
  unify map sizing.
- **Refs:** `src/app/layout.tsx`, `src/components/layout/quick-filters.tsx`, `src/components/layout/bottom-nav.tsx`, `src/app/globals.css`, `src/app/page.tsx`.

### FE-04 — Party Shortlist (the hero flow, local/no-auth)
- **Problem:** Heart is `useState`-only; never persists; Saved tab has no data source; the
  core party job (compare a few venues, share with a co-organiser) doesn't exist.
- **Approach (18C):** `useShortlist` hook (localStorage, **API-ready interface** so a Phase
  19 server can drop in without changing call sites). Persistent Saved/Shortlist tab +
  count badge. This is the spine for FE-12 (Compare) and FE-13 (Share). Server persistence
  + accounts are Phase 19.
- **Refs:** `src/components/layout/bottom-nav.tsx`, `src/app/saved/page.tsx`, `src/components/venues/venue-card.tsx`, `src/hooks/use-shortlist.ts`.

### FE-12 — Compare Party Venues (side-by-side) — NEW
- **Problem:** Choosing a party venue means weighing price/child, capacity, age fit,
  distance and trust across 3–4 options — impossible in a scrolling list.
- **Approach:** A **compare view** of shortlisted venues laid out as a column-per-venue
  table on desktop / horizontally-scrollable cards on mobile: price/child, capacity, age
  fit, distance, hours, trust signals, and a per-column `Enquire/Call/Book` CTA. Honest
  "—" where 18D data is absent. No backend.
- **Refs:** `src/app/saved/page.tsx` (or `src/app/compare/page.tsx`), `src/components/venues/compare-table.tsx`, `src/hooks/use-shortlist.ts`.

### FE-13 — Share a Shortlist (encoded link, no-auth) — NEW
- **Problem:** Party planning is collaborative; there's no way to send "here are my 3 picks"
  to a partner.
- **Approach:** Encode the shortlist (venue ids/slugs) into a shareable URL (e.g.
  `/shortlist?v=…`) using the Web Share API where available, copy-link fallback. Opening
  the link rehydrates the shortlist read-only (and lets the recipient save it locally). No
  server, no accounts.
- **Refs:** `src/app/shortlist/page.tsx`, `src/lib/shortlist-link.ts`, `src/hooks/use-shortlist.ts`.

### FE-05 — Full-Screen Mobile Map & Lazy MapLibre
- **Problem:** Mobile map is a fixed `h-[420px]` block below the list; MapLibre inits even
  when secondary; markers small (`circle-radius: 10`).
- **Approach:** Mobile List⇄Map segmented control with a true full-screen map; lazy-init
  MapLibre when opened; larger touch targets + "recenter to me". Useful across categories;
  the map-first surface for parks (the free-party option).
- **Refs:** `src/app/page.tsx`, `src/components/map/venue-map.tsx`.

### FE-06 — Installable PWA & Offline Shell
- **Approach:** `app/manifest.ts` + maskable icons + `theme-color`; minimal offline shell
  (app frame + local Shortlist). Lightweight; lower priority than the party flow + FE-11.
- **Refs:** `src/app/layout.tsx`, `public/`.

### FE-07 — Personalization (kids' ages, favourites, recent searches)
- **Approach:** One-time "set your children's ages" (turns the dead age control into a
  retention feature) feeding **party age-fit** on cards + ranking; remember favourite
  categories and recent searches — all client-side. No backend.
- **Refs:** `src/hooks/use-search.tsx`, `src/components/layout/hero.tsx`, `src/hooks/use-preferences.ts`.

### FE-08 — LCP/CLS & Icon Delivery
- **Problem:** Plain `<img>` (no dims → CLS); blurred hero bg not preloaded; Material
  Symbols via render-blocking remote `<link>` flashes raw ligatures.
- **Approach:** `next/image` with sizes; preload hero LCP asset; self-host/preload icon
  font with `font-display`.
- **Refs:** `src/components/venues/venue-card.tsx`, `src/components/layout/hero.tsx`, `src/app/layout.tsx`, `next.config.js`.

### FE-09 — List Virtualization & Lazy Data on Mobile
- **Approach:** Virtualize/paginate the venue list on mobile; desktop unchanged.
- **Refs:** `src/components/venues/venue-list.tsx`, `src/lib/api.ts`.

### FE-10 — Accessibility to WCAG 2.1 AA
- **Approach:** Modal focus trap + focus restore; keyboard-accessible list equivalent for
  map results; fix quick-filter chip contrast to AA.
- **Refs:** `src/components/modals/venue-detail-modal.tsx`, `src/components/layout/quick-filters.tsx`, `src/components/map/venue-map.tsx`, `tailwind.config.js`.

### FE-11 — Real Trust Signals (replaces the fake "Safe-checked" badge)
- **Problem:** `isSafeChecked()` returns true on `rating >= 4` — a fabricated trust signal
  on a kids' product.
- **Approach:** Replace with **verifiable** signals: FHRS food-hygiene rating (via
  `fhrs_establishment_id`), accessibility flags from `features`, owner-verified
  (`claimed_at`), and transparent data provenance (`source`). Explicit "not yet verified"
  states. Where a signal is absent, say so honestly rather than guessing.
- **Refs:** `src/components/venues/venue-card.tsx`, `src/components/venues/venue-detail-content.tsx`, `src/lib/api.ts` (expose `fhrs_establishment_id`, `features`, `source`, `claimed_at`).

## Paired Data Dependency — Phase 18D (the party-data spine, run FIRST)

18C cannot make the party product *great* on its own; it renders data 18D produces. These
are now a **dedicated phase (18D)**, not just a backlog, because they are the gating
constraint:

- **DATA-PARTY-01:** `party_capable` flag + "hosts parties" detection for softplay /
  community_hall / leisure_centre / museum / café (currently 0% / not captured).
- **DATA-PARTY-02:** `party_price_from` (+ unit: per-child/per-hour/flat) for party-capable
  venues (currently ~0%).
- **DATA-PARTY-03:** `party_max_capacity` and party package names (currently absent).
- **DATA-PARTY-04:** Enquiry/booking link (`party_enquiry_url` / populate `booking_url`)
  and improved **contact for community halls** (7% phone today).

Still routed as ongoing enrichment backlog (not party-critical, lower priority):
- Images for softplay/party (47% → higher); parks need `features`, not photos.
- Normalise `opening_hours` to one canonical structure.

## Success Criteria (product outcomes, not vanity scores)

- **Party outcome (via Plausible** `SearchPerformed`, `VenueSelected`, `VenueViewed`,
  `VenueSaved` + new `ShortlistCompared`, `ShortlistShared`, `PartyEnquiryClicked`**):**
  measurable **party-enquiry / call / booking click-through** on party-capable venues;
  non-zero shortlist creation, compare, and share usage.
- **Experience:** the party flow (search → shortlist → compare → share/enquire) is
  completable on mobile in a few taps; no blank cards; trust signals all verifiable.
- **Technical (guardrails, not the goal):** Lighthouse mobile Perf ≥ 90 / A11y ≥ 95;
  LCP < 2.5s on 4G; CLS < 0.1; zero horizontal scroll at 320px; installable PWA.

## Canonical References

- `.planning/ROADMAP.md`, `.planning/STATE.md`
- `.planning/phases/18D-party-data-extraction-weeks-25-26/` (the data dependency)
- `src/app/{page,layout}.tsx`, `src/app/globals.css`
- `src/components/layout/{hero,header,bottom-nav,quick-filters}.tsx`
- `src/components/venues/{venue-card,venue-list,venue-detail-content}.tsx`
- `src/components/modals/venue-detail-modal.tsx`, `src/components/map/venue-map.tsx`
- `src/lib/api.ts`, `src/hooks/{use-search,use-location,use-map}.ts(x)`

## Deferred Ideas (→ Phase 19)

- Server-backed shortlist persistence, accounts, and cross-device sync (18C ships the
  local/no-auth version of save/compare/share).
- Owner-side party-enquiry inbox / lead capture (built on FE-13's enquiry events).
- Aggregated multi-venue enquiry ("email all three") with owner accounts.
