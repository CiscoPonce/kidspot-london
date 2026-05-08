# Phase 12: Party Portal Reliability (London) — Research & Upgrade Plan

**Created:** 2026-05-05  
**Last updated:** 2026-05-06  
**Status:** Research → Planning  
**Constraint:** **No Google Maps / Google Places / Google APIs** for core discovery, geocoding, or enrichment.  
**Parent context:** Phase 11 tightened the UX around four chips; production incidents showed **single `type` + nightly Yelp enrichment** can silently undo manual and party-relevant classification (see forensic note in chat / cron `mapVenueType`).

---

## 1. Executive summary — is the current channel mix “good enough”?

**For a demo or early MVP:** the current stack (Postgres + PostGIS, OSM Overpass, Yelp Fusion, Brave as last resort) is *understandable* and cheap to run.

**For positioning as “the main London portal for kids’ parties”:** it is **not** sufficient on its own. Reasons are structural, not cosmetic:

| Gap | Why it hurts “party portal” trust |
|-----|-------------------------------------|
| **Directory categories ≠ party intent** | Yelp/OSM describe *what a place is* (gym, leisure_centre), not *what parents hire* (soft play party package, private room, bouncy castle slot). |
| **Single winning `type`** | Real venues are multi-purpose. One nightly `UPDATE type = …` from Yelp will keep producing regressions for edge cases (leisure centre + soft play + Better Gym branding). |
| **Fragmented truth in London** | There is **no single national open dataset** of “all kids’ party venues.” London truth is **composite**: councils, operators, OSM volunteers, and FSA registrations overlap imperfectly. |
| **Open-data landscape is shifting** | Example: **GiGL** (Greenspace Information for Greater London) historically supplied rich greenspace/play-space open data via the London Datastore but **paused open publishing** (review underway as of late 2025). Any plan that assumed GiGL as a stable pillar needs a fallback. |

**Conclusion:** The **pipeline shape** (core DB + geo + enrichment) stays. The **upgrade** is to add **multiple independent signals**, **party-centric facets**, **provenance**, and **enrichment guardrails** — not to swap one API for another “magic” API. Without Google, reliability comes from **cross-verification and curated seeds**, not from one vendor’s category graph.

---

## 2. Reliability model (what “reliable” means here)

Define reliability in five dimensions so engineering and editorial work are measurable:

1. **Coverage** — % of postcode sectors (or LSOAs) with ≥1 **party-relevant** venue within parental default radius (e.g. 3–5 mi). *Measured using the fixed panel and rubric in §11.*
2. **Precision** — % of listed venues that truly offer **kids’ party or private hire** (manual spot-checks + user flags). *Target and method: §11.*
3. **Stability** — manual seeds and editor locks are **not overwritten** by batch jobs without explicit rules.
4. **Freshness** — name/address/closure signals refreshed on a schedule with **source-tied** timestamps (not one `last_scraped` for everything).
5. **Explainability** — each material field can answer “**why do we believe this?**” (OSM node id, FSA id, council CSV row, operator feed, editor).

Until these are explicit, “more APIs” only adds noise.

---

## 3. Channel research matrix (no Google)

Below: **what each channel is good for**, **limits**, and **how KidSpot should use it** in an upgraded architecture.

### 3.1 OpenStreetMap (OSM) + Overpass API

| Strength | Weakness |
|----------|----------|
| Free, global, strong community in UK; good for **named** `leisure=indoor_play`, many `leisure=playground`, some `leisure=trampoline_park` / related | **Incomplete** for commercial party packages; tagging inconsistency; **fitness_centre** venues may omit indoor play tags |

**Upgrade tactics**

- Treat OSM as **geometry + baseline name + external id** (`source_id` = `node|way|relation` id), not as party suitability.
- Expand queries using **wiki-aligned tags**: `leisure=indoor_play`, `kids_area=*`, `min_age` / `max_age` where present (see [OSM wiki: leisure=indoor_play](https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dindoor_play)).
- Respect **[Overpass usage policy](https://operations.osmfoundation.org/policies/overpass/)**: cache aggressively, run bulk extracts off-peak, prefer **planet diff / regional extracts** at scale instead of hammering the public instance.

**Geocoding / reverse geocoding without Google:** use **Postcodes.io** (below) for UK postcodes; use **Nominatim** sparingly for address geocoding with caching and/or **self-hosted** Nominatim if volume grows ([usage policy](https://operations.osmfoundation.org/policies/nominatim/)).

### 3.2 Food Standards Agency — Food Hygiene Rating Service (FHRS)

**API:** [api.ratings.food.gov.uk](https://api.ratings.food.gov.uk/) — JSON, **no registration** for standard use; supports **name**, **address**, **lat/lon**, **distance**, **local authority**, **business type**. Guidance: FSA publishes developer documentation (e.g. API v2 help + open data downloads).

| Strength | Weakness |
|----------|----------|
| **Authoritative** for “this registered food business exists at this address” with **geo** on many establishments; great **dedup key** (FSA establishment id) | **Not** a party directory; includes schools, care homes, supermarkets — must **filter business types** |
| High refresh rate via local authorities | Soft play without catering might be **absent** |

**Use in KidSpot**

- **Convergence layer:** “does this OSM/Yelp candidate have a matching FHRS row nearby?” boosts trust score.
- **Address normalisation** and **postcode cleanup** for London.
- **Party-adjacent filter:** maintain an explicit **allowlist of FHRS `businessTypeId` values** (curated from the FSA schema and reviewed quarterly). Do not ingest “all food premises in London.”

### 3.3 data.gov.uk + borough open data portals

| Strength | Weakness |
|----------|----------|
| **Adventure playgrounds**, **play areas**, **leisure centre** datasets exist for **some** councils (often GeoJSON/CSV/ArcGIS) | **No unified London-wide** file; each borough differs; stale snapshots common |

**Use in KidSpot**

- Build a **London Borough Ingest Pack**: scripted downloads + licence headers stored per dataset.
- Prefer **fixtures with coordinates** already; otherwise geocode with **Postcodes.io** + OS address layers where licenced (§3.11).

**Examples to track (illustrative, not exhaustive):**

- [data.gov.uk — Leisure centres (Lambeth example)](https://www.data.gov.uk/dataset/ce44a658-fbdc-4d28-a9e8-132f07f4bea4/leisure-centres25)
- [data.gov.uk — Adventure playgrounds (national CKAN entry; verify licence)](https://ckan.publishing.service.gov.uk/dataset/adventure-playgrounds1)
- Borough hubs (e.g. Lambeth data hub — “public facilities” class data).

### 3.4 London Datastore (GLA)

| Strength | Weakness |
|----------|----------|
| Large catalogue of London datasets; good for **demographic / ward** context and some leisure tags | **GiGL** uncertainty — do not depend on a single greenspace provider without a contract or mirror |

**Use:** enrichment for **“green space / play access”** storytelling and SEO, not primary commercial party listings unless dataset explicitly lists bookable venues.

### 3.5 London Sport Data Hub (`data.londonsport.org`)

| Strength | Weakness |
|----------|----------|
| Claims **~12k+ sports facilities** in London; mission-aligned with **activity** | May skew to **sport** not **soft play party**; API/export terms need a direct read before production reliance |

**Use:** supplemental **facility points**; map to internal `sport_facility` facet; cross-link OSM leisure/sports tags.

### 3.6 OpenActive

**What it is:** Community standard ([openactive.io](https://www.openactive.io/)) for **session / opportunity** data; used by councils and leisure operators (e.g. leisure centre platforms publishing feeds).

| Strength | Weakness |
|----------|----------|
| **Structured activities** (what happens, where, when) — closer to **parent intent** than static POIs | Not every operator participates; feeds vary in quality |

**Use**

- **Phase B/C:** ingest OpenActive **Locations** + **ScheduledSession** where available to show “this centre runs kids sessions” even when OSM is thin.
- Positions the product toward **“what can we do this Saturday?”** without Google.

**London pilot targets (to validate in discovery, not assumed live):**

- Borough or trust leisure sites already advertising OpenActive (e.g. council leisure portals using compliant feeds).
- National / regional **OpenActive data catalogs** (dataset registration endpoints) — use to enumerate publishers, then **allowlist** feeds in ingest.
- At implementation time: record each feed’s **publisher name, base URL, licence, refresh cadence** in `venue_source_claims` metadata.

### 3.7 Operator and chain sources (partnership-first, crawl as fallback)

| Strength | Weakness |
|----------|----------|
| **GLL, Better, Everyone Active, trampoline chains, farm parks** — structured “find a centre” locators | **Scraping** is legally fragile (ToS / robots / layout churn) and operationally brittle |

**Preferred order**

1. **Partnership or bilateral data** — CSV, static JSON, affiliate feed, or “use our listing API” agreements. Lowest risk; best freshness if the partner maintains it.
2. **Formal licensed datasets** — where operators resell or publish under OGL-like terms (rare; capture when it appears).
3. **Allowlist crawler** — only after **legal review**, rate limits, `User-Agent` policy, and **snapshot tests** in CI. Store **listing URL** + `last_verified_at` + **ToS version** referenced.

**Anti-pattern:** treating scraped chain locators as the **canonical** geometry without cross-checking OSM/Postcode.

### 3.8 Web search (e.g. Brave) — **discovery only**

| Strength | Weakness |
|----------|----------|
| Finds **official website** when DB + OSM miss | Returns **listicles** and SEO spam |

**Use (already aligned with recent backend direction)**

- Only propose **new URLs** or **new names** to a **review queue** or automated fetcher with **strict allowlist TLD** and **blocklist domains**.
- Never promote web search results straight into `venues` without **fetch + parse + dedupe**.

### 3.9 Yelp Fusion (existing)

| Strength | Weakness |
|----------|----------|
| London coverage, ratings, photos | **Categories mis-align** with party intent; caused **type regression** when used as write-path |

**Use in upgraded architecture**

- **Read-only enrichment** for rating/price *unless* `editor_locked` or provenance conflicts — see §5.
- Stop using Yelp `mapVenueType` as **sole authority** for parent-facing facets.

### 3.10 Postcodes.io (UK)

**URL:** [postcodes.io](https://postcodes.io/) — ONS/OS open data backed; no API key on public tier.

**Use:** postcode → lat/lon, bulk lookup, boundaries — **replacement layer for Google geocoding** in product flows.

### 3.11 Ordnance Survey (OS) — UK geography & addressing

The **Ordnance Survey** provides authoritative UK geographic and addressing products (open and commercial tiers vary over time).

| Strength | Weakness |
|----------|----------|
| **Gold-standard** GB spatial reference and naming; reduces bad geocodes vs ad-hoc parsing | Some datasets **licensed** (cost / attribution / registration); must track terms per product |
| Complements Postcodes.io for **boundary analytics** and **official place names** | Not a substitute for **party intent** — still composite with OSM/FHRS |

**Use in KidSpot**

- **When address quality hurts dedupe:** consider OS open data layers (e.g. **OS Open Names**, **Code-Point Open** alignment) alongside Postcodes.io.
- **Operational note:** add a **cost / licence decision record** before production hard-dependency; prefer **self-hosted mirrors** of open releases where permitted.

### 3.12 Wikidata (and Wikipedia-derived enrichment)

**Wikidata** offers structured entities (identifiers, coords, official website, “instance of”, located in) for many public and commercial POIs.

| Strength | Weakness |
|----------|----------|
| **Cross-reference hub** (links to OSM via properties, external IDs) | Coverage **uneven** for small commercial venues; **volunteer-maintained** |
| No Google dependency | Data can be **stale** or **wrong**; must never be sole authority |

**Use**

- **Signal only:** propose `official_website`, alternative names, or **disambiguation** when OSM/Yelp disagree.
- Store as `venue_source_claims` with **low default confidence** unless corroborated by operator site or FHRS.

### 3.13 VisitEngland / national tourism listings (secondary)

Tourism body listings sometimes include **family attractions** and **museums**. Quality and API access change over time.

**Use:** **secondary seed** for named attractions and SEO landing pages — not primary for community halls or neighbourhood soft play. Verify **terms of use** before bulk ingest.

### 3.14 Charity Commission for England and Wales (community halls — long tail)

Many **village halls** and **community centres** are charities. The register provides **name, charity number, objects** — sometimes useful for **hall_hire** discovery.

| Strength | Weakness |
|----------|----------|
| Authoritative for **charity existence** | **Weak or no coordinates**; heavy **manual filtering** (not every charity is bookable for parties) |

**Use:** optional **batch enrichment** for `hall_hire` facet; **geo** must come from council CSV, OSM, or postcode on charity correspondence address.

---

## 4. Recommended target architecture (conceptual)

```
                    ┌─────────────────────────────────────────┐
                    │         Manual / partner seed            │
                    │  (allowlist chains, borough CSVs, PR)    │
                    └─────────────────┬───────────────────────┘
                                      ▼
┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌─────────────┐
│ OSM      │   │ FHRS     │   │ Council CSV  │   │ OpenActive  │
│ Overpass │   │ API      │   │ data.gov.uk  │   │ feeds       │
└────┬─────┘   └────┬─────┘   └──────┬───────┘   └──────┬──────┘
     │             │                   │                   │
     └─────────────┴─────────┬─────────┴───────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Normalise + dedupe  │
                  │  (§4.1)              │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Party facet graph   │
                  │  (multi-tag + score) │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Enrichment guard    │
                  │  (locks, provenance) │
                  └──────────┬───────────┘
                             ▼
                      Postgres + PostGIS
                             ▼
                         API + Web
```

**Key principle:** no single upstream field owns “truth”; **merge with provenance**.

### 4.1 Normalisation & deduplication rules

Without concrete merge rules, “dedupe” becomes tribal knowledge and quality drifts.

**Identifiers (descending trust for “same venue”)**

1. **Exact external id match** — same `fhrs_establishment_id`, or same OSM `type:id`.
2. **Strong fuzzy match** — normalised UK postcode **identical** + **Levenshtein / token-set** name similarity above threshold **and** length within one floor & one unit of distance (e.g. **< 80 m** unless high-rise centroid ambiguity documented).
3. **Weak fuzzy match** — same postcode sector + similar name → **flag for review**, do not auto-merge in production until rule tuned on labeled set.

**Normalisation (apply before compare)**

- Postcode: uppercase, single space, valid format via Postcodes.io validation.
- Name: strip legal suffix noise (`ltd`, `plc`), unify `&` / `and`, lower-case for compare, preserve display name separately.
- Address: optional **libpostal** or UK-specific parser if volume justifies; otherwise phased rollout per borough CSV quality.

**Precedence**

- **Geometry:** prefer OSM node/way centroid when verified; else council CSV; else Postcodes.io centre of postcode (lowest precision — flag `geo_confidence=low`).
- **Display name:** prefer **manual** → **operator partner** → OSM → Yelp (policy table versioned in repo).

**Operational requirement**

- Log every auto-merge in `venue_merge_log` (source pair, score, rule id). Enable **rollback** of bad merges.

---

## 5. Data model & product upgrades (concrete backlog)

### 5.1 Multi-facet party model (replace single `type` as sole filter)

Introduce machine-usable facets, e.g.:

- `soft_play`, `trampoline`, `party_room`, `activity_session`, `farm_venue`, `museum_programme`, `hall_hire`, `outdoor_play`

Search filters become **OR over facets** + optional `primary_label` for UI chips.

**Migration:** keep `type` for backward compatibility during transition; add `parent_facets` (jsonb or `venue_facets` join table) as the **searchable** contract.

### 5.2 Product truth model: operator-derived vs parent-facing

Split “what Yelp/OSM say” from “what we show parents”:

| Field family | Purpose | Writable by |
|--------------|---------|-------------|
| **`operator_labels` / raw categories** | Snapshot of Yelp/OSM/OS categories for debugging | Batch jobs (append-only or versioned) |
| **`parent_facets`** | Facets used in search chips and copy (“Soft play parties”) | Rules engine + **editors** + guarded batch |
| **`evidence_urls[]`** | PDF/price-list/official party URL backing a facet | Editors, partner onboarding |

**Rule:** nightly jobs may update **operator_labels** and **ratings**; they may **not** shrink **parent_facets** or **primary_label** without `editor_locked=false` or explicit merge policy.

### 5.3 Provenance table

`venue_source_claims`:

- `venue_id`, `source` (osm, fhrs, yelp, council_lambeth, wikidata, …), `external_id`, `payload_hash`, `fetched_at`, `confidence`

Enables debugging (“why did we list X?”) and **rollback**.

### 5.4 Enrichment guardrails (fixes known production bug class)

- **`source = manual` or `editor_locked = true`** → batch jobs **must not** overwrite `parent_facets`/`primary_label` without rule-specific bypass.
- **Conflict detection:** if Yelp proposes `leisure_centre` but OSM, FHRS, or manual evidence supports **soft play** → **flag for review** or prefer structured / manual sources per precedence table (§4.1).

### 5.5 Scoring v2

Combine:

- Distance (existing)
- **Facet match** to query intent
- **Independently corroborated** (OSM + FHRS + council) → boost
- **Single weak source** (Brave title only) → cap rank or quarantine

### 5.6 Human editorial workflow (minimal viable)

- CSV import + diff preview
- “Verify party package” boolean with **evidence URL** (operator price list)
- **Dispute queue** fed by user reports (§14)

---

## 6. Implementation waves (suggested order)

| Wave | Scope | Outcome |
|------|--------|---------|
| **12.1** | **Guardrails** — stop silent regressions (`manual`/`editor_locked`, Yelp must not own `parent_facets`) | Trust restored; Phase 11 UX stable |
| **12.2** | **Thin facet schema + API** — minimal `parent_facets[]`, OR semantics in `/search`, migration for chips | New rows use correct shape **before** heavy FHRS graph work |
| **12.3** | **FHRS convergence** — curated business-type allowlist, match & attach to `venue_id` | Addresses + dedupe + trust |
| **12.4** | **Borough CSV pack** — automate 5–10 high-value borough datasets | Step-change in coverage for parks/halls |
| **12.5** | **OpenActive pilot** — 1–2 enumerated feeds (see §3.6) | Session-aware UX (differentiator) |
| **12.6** | **Operator integration** — **partner CSV first**; allowlist crawler only after legal review | Chain completeness |

**Wave sequencing note:** **12.2 before full 12.3** so FHRS and council rows attach to a **stable `venue_id` and facet model**; avoids re-keying matched establishments after schema churn.

---

## 7. Risks, ethics, compliance

- **Licences:** Each borough dataset has its **OGL or custom licence** — store `licence_url` with the ingest job.
- **OSM:** Attribute © OpenStreetMap contributors; follow [copyright guidelines](https://www.openstreetmap.org/copyright).
- **FSA:** Respect API / download terms; cache responsibly; document **business-type allowlist** rationale (GDPR is low risk for business listings; still avoid storing unnecessary personal fields).
- **Scraping:** maintain **ToS decision log**; prefer **partnership** over unattended crawl for chains.
- **Personal data:** Owner claim flows stay separate; ingestion is **business listing** data only.
- **GiGL / third parties:** Re-verify redistribution rights before mirroring any paused datasets.

---

## 8. Success criteria (Phase 12 exit)

Targets below use the **methodology in §11** (panel size, rubric, baselines). Checklist:

- [ ] **Zero silent facet/label regressions** for `manual` or `editor_locked` venues in **30-day** burn-in (audit `venue_source_claims` + change log).
- [ ] **Coverage:** **≥ 75%** of the §11 postcode panel returns **≥ 1** venue with `parent_facets` containing `soft_play` **or** `party_room` within **5 mi** **OR** product shows an explicit **“coverage gap”** state with borough on roadmap (baseline and measurement: §11.2–11.3).
- [ ] **Precision:** **≥ 90%** on stratified sample of **60** list-detail reviews (**party-relevant rubric**, §11.4).
- [ ] **Dedup quality:** **< 5%** duplicate rate on weighted sample (**§11.5**).
- [ ] **Provenance:** **100%** of production venues have **≥ 1** `venue_source_claims` row after migration window.
- [ ] **No Google** dependency added in ingest or runtime geocoding paths (Postcodes.io / OS open data / OSM stack only).
- [ ] **User trust:** published **SLA** for data corrections (§14) and **≥ 95%** of critical corrections closed within SLA in pilot month (tracked in issue system).

---

## 9. Reference links (non-Google)

- [FSA Food Hygiene Rating API](https://api.ratings.food.gov.uk/Help/Index)
- [FSA Open Data / downloads](https://ratings.food.gov.uk/open-data/)
- [OpenStreetMap indoor_play wiki](https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dindoor_play)
- [OpenStreetMap kids_area wiki](https://wiki.openstreetmap.org/wiki/Key:kids_area)
- [Overpass API / usage](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Postcodes.io documentation](https://postcodes.io/docs/overview/)
- [Ordnance Survey](https://www.ordnancesurvey.co.uk/) — product / open data pages per deployment
- [Wikidata Query Service](https://query.wikidata.org/) — optional SPARQL for batch enrichment design
- [data.gov.uk](https://www.data.gov.uk/)
- [London Datastore](https://data.london.gov.uk/)
- [London Sport Data Hub](https://data.londonsport.org/)
- [OpenActive](https://www.openactive.io/)
- [OpenActive Modelling Opportunity Data 2.0](https://openactive.io/modelling-opportunity-data)
- [Charity Commission register](https://www.gov.uk/government/organisations/charity-commission-for-england-and-wales)

---

## 10. Folder note

Project convention stores phase specs under **`.planning/phases/`**. There is no separate **`.phases/`** directory in the repo root; this file follows the same pattern as `11-search-experience-v2/11-CONTEXT.md`.

---

## 11. Evaluation methodology (coverage, precision, dedupe)

Concrete measurement replaces “≥ X%” placeholders and makes Phase 12 **falsifiable**.

### 11.1 Fixed postcode panel (n = 50, stratified)

Build a CSV **versioned in repo** (e.g. `.planning/phases/12-party-portal-reliability/fixtures/evaluation-postcodes-v1.csv`) with:

| Stratification | Count (example) | Intent |
|----------------|------------------|--------|
| Inner London dense | 15 | OSM-rich, high competition |
| Outer London suburban | 15 | Chains + car venues |
| Near-Greater-London dormitory (commuter belt)** | 10 | Boundary stress |
| Historically “thin” sectors (manual seeds)** | 10 | Regression hunt |

\*Adjust borders to match product’s **commercial** definition of “London.”

**Columns:** `postcode`, `expected_lat`, `expected_lon` (from Postcodes.io at panel freeze date), `stratum`, `notes`.

**Freeze:** bump `v2` when methodology changes, not when data improves.

### 11.2 Coverage metric

For each panel postcode:

1. Run production-equivalent search: **radius = 5 mi**, each chip facet (`soft_play`, `party_room`, `outdoor_play`, `museum_programme` as applicable) and **All**.
2. **Pass** if **any** query returns **≥ 1** venue with **corroborated** facet (corroboration = **≥ 2** independent `venue_source_claims` sources **or** `editor_verified_party` — exact rule to be encoded in test harness).

**Report:** pass rate by stratum + list of **fail** postcodes for backlog.

### 11.3 Baseline and delta

- Record **baseline** pass rate **before** Wave 12.2 ships.
- **Exit target:** **≥ 75%** panel pass **or** documented **coverage gap** UX for fails (product policy must not silently show irrelevant Yelp/OSM noise).

### 11.4 Precision rubric (manual review)

Stratified sample of **60** venues/month from live search results.

| Grade | Definition |
|-------|------------|
| **A** | Clearly offers **kids’ birthday / party package or private hire** matchable to facet; main website or partner evidence |
| **B** | **Kids activity** venue; party not obvious — **acceptable** only if facet is `activity_session` / museum, not `party_room` |
| **C** | **Wrong facet** or **not party-relevant** |
| **D** | **Closed / duplicate / wrong location** |

**Target:** **≥ 90%** A+B combined; **< 2%** D.

### 11.5 Dedupe audit

Monthly weighted sample:

- 40 random live venues
- 20 “suspect” pairs from merge candidate queue

**Fail** if same FSA id on two `venue_id`, or **< 50 m** + **name similarity > 0.9** without merge. **Target:** **< 5%** fail rate.

---

## 12. Ordnance Survey & Wikidata — implementation checklist

- [ ] **OS:** Register for applicable **open** products; download **OS Open Names** / Code-Point alignment; document **attribution** page in app footer / about.
- [ ] **Cost review:** If team needs **higher-precision addressing**, escalate to licensed tier with **budget owner sign-off**.
- [ ] **Wikidata:** Batch job **monthly**, not real-time; SPARQL or entity-by-id with strict rate limits; write only to `venue_source_claims`.
- [ ] **Conflict policy:** Wikidata **never overwrites** `parent_facets`; may suggest `official_website` pending editor or high-confidence FHRS match.

---

## 13. Partnership-first operator strategy

1. **Segment chains** by London venue count and parent demand (soft play, trampoline, farm parks).
2. **Outbound template:** data share (CSV), **attribution** on profile, optional **sponsored** placement alignment with Phase 10 commercial rules.
3. **Integrate** partner feed as **new `venue_source_claims` source** with `confidence=high`.
4. **Crawl** only where **partnership + ToS** failure blocks MVP; legal sign-off recorded in **Risks register**.

---

## 14. User corrections, SLAs, and audit

**Surfaces**

- **Report issue** on venue detail: wrong facet, closed, duplicate, bad pin.

**Workflow**

- Ticket created with `venue_id`, snapshot of claims, user comment (no PII stored beyond email if user opts in).

**SLA (pilot defaults — tune with ops capacity)**

| Severity | Example | Target resolution |
|----------|---------|-------------------|
| **S1** | Wrong postcode / pin | **5 business days** |
| **S2** | Closed permanently | **10 business days** |
| **S3** | Facet wrong but venue open | **15 business days** |

**Audit**

- Every production change to `parent_facets` or merge actions requires **`changed_by`** (user id or `system:jobname`) + **reason code**.

**Transparency**

- Public **“Data sources & corrections”** page listing OSM ©, FSA, partners, and how to report — supports trust for “main portal” positioning.

---

*Next step: version `evaluation-postcodes-v1.csv`, run baseline coverage script, assign FSA business-type allowlist owner, and schedule Wave 12.1–12.2.*
