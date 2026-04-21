# KidSpot London — Improvement Plan

> Companion to `PROPOSED_IMPROVEMENTS.md`. This document is the opinionated, phased
> execution plan to take KidSpot London from a working soft-launch into a
> robust, low-maintenance, monetisable product.
>
> **Scope:** correctness fixes, framework upgrades, the _minimum_ useful carry-over
> from the original Python prototype, new features, and a GitHub-Actions-driven
> scraping pipeline that feeds the database without extra VPS cost.

**Last updated:** April 20, 2026
**Target codebase:** `kidspot-london/` (the Node.js/Next.js project)
**Legacy source:** `../partykids/` + sibling Python scripts (the "Old Project")

---

## 0. The Right Twist

Three shifts change KidSpot from "yet another venue directory" to a defensible product:

1. **Quality signal, not quantity.** Persist a `kid_score` and `rating` at
   ingestion time so ranking is cheap, explainable, and improves with every
   discovery run. The old Python prototype already solved this — port the
   algorithm, ignore the rest.
2. **Free scraping via GitHub Actions.** Move the cron agent off the VPS and
   into scheduled GitHub workflows that call a signed admin endpoint. Zero
   server cost, full audit trail, easy to tune per source.
3. **SEO and monetisation are the product.** Server-rendered venue pages with
   `schema.org/LocalBusiness` + a self-service "claim your listing" flow are
   what close the loop from "Google traffic" to "Stripe MRR". Everything else
   supports these two.

---

## 1. What to Keep From the Old Project (and What to Throw Away)

The old Python work explored a lot of dead-ends. Only three pieces are worth
carrying over.

### Keep

| Old file | Why it matters | Port target |
|---|---|---|
| `database_manager.py::_calculate_kid_score` | Validated keyword boosts, type weights, and disqualification list. | `backend/src/scoring/kidScore.ts` (pure function) |
| `database_schema.sql` (disqualification list) | Curated "never show" Google types (`bar`, `liquor_store`, `casino`, `adult_entertainment`, `night_club`). | Embedded as a `const DISQUALIFYING_TYPES` in the scoring module. |
| `venues.db` (selected rows only) | Potential seed data, **only** after filtering to London bounding box AND `kid_score >= 8`. | One-shot `scripts/seed-from-prototype.ts`, routed through existing `insert_venue_if_not_duplicate`. |

### Throw away (do not port)

- `apify_actor_main.js`, `google_maps_scraper.py`, `maps_api.py` — superseded by `scripts/discovery/google-places-discovery.js`.
- `n8n_integration.py`, `n8n_filter_code.py`, `simple_filter.py`, `smart_filter.py`, `split_and_filter.py`, `ai_filter_prompt.txt`, `ai_prompt_small.txt` — n8n glue code; replaced by BullMQ workers + GitHub Actions.
- `complete_workflow.py`, `setup_complete_workflow.py`, `process_new_data.py`, `process_response.py`, `data_processor.py`, `enhanced_places_api.py` — orchestration experiments; the new layered backend + queue replaces them.

This keeps the borrowed surface area tiny (one function + one constant + one
one-shot seed script), avoiding the common mistake of dragging an experimental
prototype's structure into production code.

---

## 2. Framework & Dependency Audit

Versions observed in `package.json` vs. latest stable at April 2026. Upgrade
recommendations are paired with effort estimates.

### Backend (`kidspot-london/backend/package.json`)

| Package | Current | Latest stable | Action | Breaking? |
|---|---|---|---|---|
| node (engine) | `>=20.0.0` | Node 22 LTS | Bump to `>=22.0.0` in `engines` + Dockerfiles | No |
| express | `^4.18.2` | `5.0.1` | Upgrade to Express 5 | Yes — async error handling improved, `req.query` parsing stricter |
| pg | `^8.11.3` | `8.13.x` | Minor bump | No |
| ioredis | `^5.3.2` | `5.5.x` | Minor bump | No |
| bullmq | `^5.1.5` | `5.x` (stable) | Minor bump, **and finally wire it up** (missing worker) | No |
| axios | `^1.6.2` | `1.7.x` | Minor bump, or switch to native `fetch` (Node 22 has it stable) | No |
| helmet | `^7.1.0` | `7.x` | Keep, configure CSP explicitly | No |
| express-rate-limit | `^7.1.5` | `7.x` | Keep, add `rate-limit-redis` | No |
| jest | `^29.7.0` | `29.x` | Consider migrating to `vitest` for faster TS/ESM | Yes (rewrite) |
| typescript | `^5.3.3` (devDep) | `5.8.x` | Bump; start actually using it | No |
| (new) pino | — | `9.x` | Add: structured logging | New |
| (new) zod | — | `3.23.x` | Add: env + input validation | New |
| (new) rate-limit-redis | — | `4.x` | Add: cluster-safe rate limit | New |
| (new) prom-client | — | `15.x` | Add: `/metrics` endpoint | New |

### Frontend (`kidspot-london/frontend/package.json`)

| Package | Current | Latest stable | Action | Breaking? |
|---|---|---|---|---|
| next | `14.2.5` | `16.2.0` | Upgrade to Next 16 (App Router, Server Actions, Partial Prerendering stable) | Yes — see upgrade path below |
| react / react-dom | `18.3.1` | `19.2.x` | Upgrade with Next 16 | Yes — transitions/Actions available |
| @tanstack/react-query | `5.51.1` | `5.86.x` | Minor bump | No |
| tailwindcss | `3.4.7` | `4.0.x` | Upgrade to Tailwind 4 | Yes — new engine, CSS-first config |
| maplibre-gl | `4.5.0` | `5.22.x` | Upgrade; API mostly compatible, performance improvements | Minor |
| typescript | `5.5.4` | `5.8.x` | Minor bump | No |
| eslint / eslint-config-next | `8.57.0` / `14.2.5` | `9.x` / `16.x` | Upgrade alongside Next | Yes — flat config |
| lucide-react | `^1.8.0` | `0.4xx.x` (namespace moved) | Replace with current `lucide-react` scoped release | Yes (icons import path) |
| next-plausible | `^3.12.0` | `3.x` | Keep | No |
| sonner | `^1.5.0` | `1.x` | Keep | No |

### External APIs

- **Google Places API (Legacy) → Places API (New, v1).** Legacy is deprecated
  and has been removed for new projects since March 2025. Required migration:
  new endpoints (`places.googleapis.com/v1/places:searchNearby`),
  request-level `FieldMask` header, different response shape. Affected files:
  `backend/scripts/discovery/google-places-discovery.js`,
  `backend/scripts/cron-agent.js`, `backend/src/routes/search.js`
  (`fetchGooglePlaceDetails`). Also fixes the current `review_types` field typo.

### Upgrade ordering (safe path)

1. Bump Node engine (22 LTS) and all non-breaking minor versions first.
2. TypeScript migration (see Phase 2 below) — done before Express 5 so refactors land in typed code.
3. Express 4 → 5 on the backend, **independent** from the frontend upgrade.
4. Frontend: Next 14 → 15 → 16, React 18 → 19, Tailwind 3 → 4, MapLibre 4 → 5 in one coordinated branch (they are interdependent).
5. Google Places migration last (isolated blast radius).

Each numbered step ships behind its own feature branch + CI gate.

---

## 3. Phased Execution Plan

Each phase is self-contained, independently deployable, and roughly 1 sprint.
"Definition of Done" columns are testable, not aspirational.

### Phase P0 — Correctness & Safety (ship-blockers)
**Duration:** 2 days. **Goal:** stop the bleeding before anything else.

| # | Task | Location | Done when |
|---|---|---|---|
| P0-1 | Create `backend/src/worker.js` (or remove `worker` service from `docker-compose.yml`). BullMQ is imported nowhere; the container crash-loops. | `backend/src/worker.js`, `docker-compose.yml` | `docker compose up` runs all 4 services without restart loops. |
| P0-2 | Fix Brave fallback coordinate bug — every fallback venue currently maps to the searcher's lat/lon (see `routes/search.js:94-97`). Either geocode the result or flag as non-mappable. | `backend/src/routes/search.js` | Fallback results render in a "Web Results" list, never as map pins on the searcher's location. |
| P0-3 | Change `source_id UNIQUE` to `UNIQUE (source, source_id)` so Google and OSM IDs don't collide. | `backend/db/migrations/003_composite_source_unique.sql` | Migration applied; duplicate tests pass. |
| P0-4 | Fix Google Places field mask typo (`review_types` → valid fields). Pin to v1 if upgrading now. | `backend/src/routes/search.js` `fetchGooglePlaceDetails` | Integration script returns populated `reviews`. |
| P0-5 | Use `crypto.timingSafeEqual` for admin auth; lock CORS to prod origin; set explicit CSP in `helmet`. | `backend/src/middleware/admin.ts`, `server.js` | Pen-test simple script can't bypass admin by timing. |
| P0-6 | Rate-limit in Redis (`rate-limit-redis`), remove in-memory `lastBraveSearchTime`, replace with Redis lock (`SET brave:lock … NX PX 1000`). | `backend/src/clients/redis.ts`, `middleware/rateLimit.ts`, `routes/search.js` | 4 concurrent workers respect 1 r/s Brave quota. |
| P0-7 | Add `pino` + request IDs; replace `console.log`. | `backend/src/config/logger.ts` + app-wide | Log lines are JSON with `req.id`. |
| P0-8 | Add deep `/ready` endpoint (checks Postgres `SELECT 1`, Redis `PING`). | `backend/src/server.js` | Returns 503 if any dependency is down. |
| P0-9 | Register a single Redis client and single PG pool; delete per-route `new Redis()` / `dotenv.config()`. | `backend/src/clients/` | grep finds exactly one `new Redis` and one `new Pool`. |

**Definition of Done for P0:** fresh clone, fresh `docker compose up`, all
services green, admin action logs show timing-safe compare, and a Brave
fallback search no longer corrupts the map.

---

### Phase P1 — Quality Baseline (foundations)
**Duration:** 3–5 days. **Goal:** make further change safe.

| # | Task | Notes |
|---|---|---|
| P1-1 | Layered backend refactor (from `PROPOSED_IMPROVEMENTS.md` §2). Controllers thin, services testable, clients pure I/O. | `src/{controllers,services,clients,middleware}/` |
| P1-2 | Incremental TypeScript migration. Start with `utils/`, `clients/`, `services/`. Share a `packages/shared/types.ts` consumed by both backend and `frontend/src/lib/api.ts` (today the FE redefines `Venue` inconsistently). | `tsconfig.json` with `allowJs: true`, `strict: true` |
| P1-3 | Real unit + route tests with Jest (or Vitest) and Supertest. Cover: scoring, dedup SQL, validators, all happy/sad paths in `search` and `sponsors`. The existing `scripts/test-*.js` are useful as e2e smoke tests — keep, don't discard. | `src/**/*.test.ts` |
| P1-4 | GitHub Actions CI pipeline: lint → typecheck → test → `docker build` on every PR. | `.github/workflows/ci.yml` |
| P1-5 | ESLint flat config (v9), Prettier, lint-staged + Husky. | `eslint.config.js`, `.husky/` |
| P1-6 | Add `zod` schemas for all query params and body params; throw `400` with human-readable errors. | `src/schemas/` |

---

### Phase P2 — Data Model & Ranking (the real differentiator)
**Duration:** 1 week. **Goal:** persisted `kid_score`, explainable ranking, better search.

| # | Task | Notes |
|---|---|---|
| P2-1 | Migration `004_enrich_venues.sql`: add `kid_score SMALLINT`, `rating NUMERIC(2,1)`, `user_ratings_total INT`, `raw_types TEXT[]`, `opening_hours_summary TEXT`, `wheelchair_accessible BOOLEAN`, `age_range INT4RANGE`. | Keeps "lean DB" philosophy — these are all ranking/filter inputs, not heavy payloads. |
| P2-2 | Port `_calculate_kid_score` from Python to `backend/src/scoring/kidScore.ts`. Pure function, 100% unit test coverage. | Carry across keyword boosts, type weights, disqualification list verbatim. |
| P2-3 | Apply scoring at **ingestion** (filter out disqualified types, persist score). Apply ranking at **query** (`ORDER BY sponsor_tier, sponsor_priority DESC, kid_score DESC, distance ASC`). | Update `search_venues_by_radius` SQL function. |
| P2-4 | Replace exact-levenshtein dedup with `pg_trgm similarity(name, ?) > 0.7` within 50 m. Less false negatives on long venue names. | Migration + function rewrite. |
| P2-5 | Add `venue_types` dimension table and convert `venues.type` to FK-validated values (or a `CHECK` constraint enum). | Removes the current drift between route validator and DB. |
| P2-6 | Back-fill script: iterate existing venues, call Google Places (New) Details, persist rating + raw_types, rescore. Budget-aware (10 rps, resumable). | `backend/scripts/backfill-enrichment.ts` |

---

### Phase P3 — Discovery Pipeline on GitHub Actions (see §4 for detail)
**Duration:** 3–5 days. **Goal:** no more cron running on the VPS.

Covered in full in [Section 4](#4-github-actions-scraping-pipeline).

---

### Phase P4 — Product Surface: SEO + Revenue Loop
**Duration:** 1–2 weeks. **Goal:** turn search traffic into paying sponsors.

| # | Task | Notes |
|---|---|---|
| P4-1 | Make `/venue/[slug]/page.tsx` fully SSR + ISR with `generateStaticParams()` backed by `/api/search/slugs`. Expand JSON-LD (address, geo, aggregateRating, openingHoursSpecification, sameAs). | Today the JSON-LD is minimal and fetch is client-side for some fields. |
| P4-2 | Split sitemap into `sitemap-index.xml` with per-type children (boroughs, categories, venues). Needed for scale (>50k URLs per sitemap limit). | `frontend/src/app/sitemap-index.xml/route.ts` etc. |
| P4-3 | **Claim your listing** flow: public form on `/venue/[slug]` → email verification → `POST /api/claim/:venue_id` → admin approval → Stripe Checkout (Bronze/Silver/Gold) → webhook calls `update_sponsor_tier`. | `frontend/src/app/claim/[slug]/`, `backend/src/routes/claim.ts`, `backend/src/routes/stripe.ts` |
| P4-4 | Admin audit log table (`admin_actions`) + `/api/admin/audit` (admin-only). | Revenue fraud prevention. |
| P4-5 | Analytics: Plausible custom events (`search`, `fallback_triggered`, `outbound_click`, `claim_submitted`, `stripe_checkout_started`, `stripe_checkout_completed`). Mirror to server-side `prom-client` counters for ad-blocked users. | |
| P4-6 | Root `page.tsx` → Server Component with a client `<SearchAndMap>` island. Reduces first-paint JS by ~50%. | Use Suspense + streaming. |
| P4-7 | Map clustering via MapLibre's native cluster layer (or Supercluster). Prevents overlapping pins at high venue density. | `frontend/src/components/map/venue-map.tsx` |

---

### Phase P5 — Framework Upgrades & Polish
**Duration:** 1 week. **Goal:** get on current majors.

Ordered per §2:

1. Node 22, minor bumps everywhere, Jest → Vitest (optional).
2. Express 4 → 5 (backend only).
3. Next 14 → 16, React 18 → 19, Tailwind 3 → 4, MapLibre 4 → 5, ESLint 9 flat config. Run Next.js codemods (`npx @next/codemod@canary upgrade latest`).
4. Google Places Legacy → v1.
5. Tighten CSP to exclude any packages removed in the upgrade.
6. Lighthouse + axe-core audit; target LCP < 2.0 s on 3G, CLS < 0.05, WCAG AA.

---

### Phase P6 — Optional / Nice-to-have

- PWA manifest + offline shell (install prompt on home page).
- `seed-from-prototype.ts` (see §1) — run once, archive the old repo.
- LLM-powered scraper for church halls (OpenRouter) — only if discovery coverage gaps surface in analytics.
- User favourites (anonymous, device-local) + recently viewed.
- Multi-city expansion: add `city TEXT` with default `'london'`, pull London-specific constants into a `cities/london.ts` module.

---

## 4. GitHub Actions Scraping Pipeline

This replaces the VPS-resident `cron-agent.js`. It's free, auditable, and
tunable per-source.

### 4.1 Architecture

```
┌─────────────────────┐       HTTPS (POST, HMAC)       ┌────────────────────────┐
│   GitHub Actions    │  ────────────────────────────▶ │  Backend Admin API     │
│  (scheduled cron)   │                                │  /api/admin/ingest/*   │
│                     │  ◀──── 202 Accepted (jobId) ── │  → enqueues BullMQ job │
└─────────────────────┘                                └──────────┬─────────────┘
                                                                  │
                                                                  ▼
                                                   ┌────────────────────────────┐
                                                   │   BullMQ Worker Container  │
                                                   │   (src/worker.ts)          │
                                                   │   → Fetches upstream API   │
                                                   │   → Scores, dedupes        │
                                                   │   → UPSERTs into Postgres  │
                                                   └────────────────────────────┘
```

Workflows call a thin, signed admin endpoint instead of writing to the DB
directly — so the VPS remains the only thing that touches Postgres, and
rotation of the signing secret instantly kills compromised runners.

### 4.2 Backend: signed ingest endpoints

New file `backend/src/routes/ingest.ts` (TypeScript after P1):

```ts
// Pseudocode - illustrative, to implement in Phase P3
// Verifies HMAC-SHA256 of raw body using INGEST_SIGNING_SECRET.
// Enqueues a BullMQ job and returns 202 with jobId.

router.post('/admin/ingest/:source', verifyHmac, async (req, res) => {
  const { source } = req.params; // 'google' | 'osm' | 'datastore' | 'refresh-stale'
  const job = await ingestQueue.add(source, req.body, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
  res.status(202).json({ jobId: job.id });
});
```

The worker picks up the job and runs one of four handlers: `ingest/google.ts`,
`ingest/osm.ts`, `ingest/datastore.ts`, `ingest/refreshStale.ts`. Each calls
the already-written discovery code from `scripts/discovery/*` but refactored
into reusable functions.

### 4.3 Required repository secrets

Settings → Secrets and variables → Actions:

- `KIDSPOT_API_URL` — `https://api.kidspot.london`
- `INGEST_SIGNING_SECRET` — 32-byte hex, shared with the backend env `INGEST_SIGNING_SECRET`
- `GOOGLE_PLACES_API_KEY` — injected only for workflows that call Google directly (discouraged; prefer letting the VPS worker call Google with its own key to keep the key off GitHub).

### 4.4 Workflow files

Place these under `.github/workflows/`.

#### `.github/workflows/ingest-google.yml` — every 24 h

```yaml
name: Ingest Google Places (daily)

on:
  schedule:
    - cron: '17 3 * * *'   # 03:17 UTC every day (off-peak)
  workflow_dispatch:        # allow manual runs from the Actions tab

concurrency:
  group: ingest-google
  cancel-in-progress: false

jobs:
  trigger:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Build payload
        id: payload
        run: |
          echo "body={\"searchAreas\":[\"london\"],\"maxCalls\":500,\"since\":\"$(date -u -d '25 hours ago' +%FT%TZ)\"}" >> "$GITHUB_OUTPUT"

      - name: Sign & POST
        env:
          API_URL: ${{ secrets.KIDSPOT_API_URL }}
          SECRET: ${{ secrets.INGEST_SIGNING_SECRET }}
          BODY: ${{ steps.payload.outputs.body }}
        run: |
          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | awk '{print $1}')
          curl -fsS -X POST "$API_URL/api/admin/ingest/google" \
            -H "content-type: application/json" \
            -H "x-ingest-timestamp: $(date +%s)" \
            -H "x-ingest-signature: sha256=$SIG" \
            --data "$BODY"
```

#### `.github/workflows/ingest-osm.yml` — twice weekly

```yaml
name: Ingest OpenStreetMap (twice weekly)

on:
  schedule:
    - cron: '7 4 * * 1,4'  # Monday & Thursday 04:07 UTC
  workflow_dispatch:

concurrency:
  group: ingest-osm
  cancel-in-progress: false

jobs:
  trigger:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: POST signed payload
        env:
          API_URL: ${{ secrets.KIDSPOT_API_URL }}
          SECRET: ${{ secrets.INGEST_SIGNING_SECRET }}
        run: |
          BODY='{"bbox":[-0.51,51.28,0.33,51.70],"tags":["leisure=playground","amenity=community_centre","amenity=library","amenity=theatre"]}'
          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | awk '{print $1}')
          curl -fsS -X POST "$API_URL/api/admin/ingest/osm" \
            -H "content-type: application/json" \
            -H "x-ingest-timestamp: $(date +%s)" \
            -H "x-ingest-signature: sha256=$SIG" \
            --data "$BODY"
```

#### `.github/workflows/refresh-stale.yml` — hourly

```yaml
name: Refresh stale venues (hourly)

on:
  schedule:
    - cron: '*/60 * * * *'
  workflow_dispatch:

concurrency:
  group: refresh-stale
  cancel-in-progress: true

jobs:
  trigger:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: POST signed payload
        env:
          API_URL: ${{ secrets.KIDSPOT_API_URL }}
          SECRET: ${{ secrets.INGEST_SIGNING_SECRET }}
        run: |
          BODY='{"staleHours":24,"batchSize":50}'
          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | awk '{print $1}')
          curl -fsS -X POST "$API_URL/api/admin/ingest/refresh-stale" \
            -H "content-type: application/json" \
            -H "x-ingest-timestamp: $(date +%s)" \
            -H "x-ingest-signature: sha256=$SIG" \
            --data "$BODY"
```

#### `.github/workflows/datastore-monthly.yml` — monthly

```yaml
name: Re-import London Datastore (monthly)

on:
  schedule:
    - cron: '0 2 1 * *'  # 1st of each month at 02:00 UTC
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: POST signed payload
        env:
          API_URL: ${{ secrets.KIDSPOT_API_URL }}
          SECRET: ${{ secrets.INGEST_SIGNING_SECRET }}
        run: |
          BODY='{"datasets":["arts_centres","community_centres","sports_participation"]}'
          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | awk '{print $1}')
          curl -fsS -X POST "$API_URL/api/admin/ingest/datastore" \
            -H "content-type: application/json" \
            -H "x-ingest-timestamp: $(date +%s)" \
            -H "x-ingest-signature: sha256=$SIG" \
            --data "$BODY"
```

### 4.5 HMAC verification (backend)

Middleware `backend/src/middleware/verifyHmac.ts`:

```ts
// Pseudocode
// Rejects if:
//   - x-ingest-timestamp is older than 5 minutes  (replay protection)
//   - x-ingest-signature != sha256(HMAC(secret, rawBody))  (authenticity)
// Uses crypto.timingSafeEqual.
```

Pair this with Express `express.raw({ type: 'application/json' })` on the
ingest routes only, so HMAC is computed over the exact bytes GitHub sent.

### 4.6 Observability

- Every ingest job logs `job_id`, `source`, `rows_inserted`, `rows_updated`,
  `rows_rejected`, `duration_ms`.
- Workflow failure triggers a GitHub Actions "status: failure" notification
  (configure in repo → Settings → Notifications).
- Backend counter `ingest_rows_total{source,status}` exposed at `/metrics`.
- Alert if `rows_inserted == 0` for 3 consecutive daily Google runs (silent
  upstream failure).

### 4.7 Cost envelope

- GitHub Actions: free minutes for private repos (3,000/month on Pro) or
  unlimited on public repos.
- Each workflow trigger is a <10 s `curl`; 30-day usage is well under
  100 minutes total.
- Google Places API calls are charged against the VPS key, not GitHub's.

---

## 5. Success Metrics

These are the only numbers that matter after this plan is executed. Bake them
into `/metrics` (backend) and Plausible (frontend).

| Metric | Source | Target |
|---|---|---|
| Fallback trigger rate | backend counter | < 15 % by month 3 |
| Outbound click-through rate (`Call` / `Website`) | Plausible + `/metrics` | > 25 % of result views |
| Time-to-first-result (p95) | `prom-client` histogram | < 400 ms cached, < 1.2 s cold |
| `/venue/[slug]` LCP (p75, mobile 3G) | CrUX / Lighthouse CI | < 2.0 s |
| Organic sessions to `/venues-in/*` and `/venues-by/*` | Plausible | +10 %/month for 3 months post-sitemap split |
| Sponsor conversion | Stripe → `admin_actions` | 1 % of claimed venues upgrade to any tier |
| Ingest freshness | `MAX(NOW() - last_scraped)` | < 48 h for sponsored venues, < 14 d overall |

---

## 6. Quick Reference: Files to Create / Modify

Concrete checklist for implementation PRs. Treat each bullet as a commit.

### New files
- `backend/src/worker.ts` (Phase P0, BullMQ entrypoint)
- `backend/src/clients/{redis,db,brave,googlePlaces,osm}.ts`
- `backend/src/services/{venueService,discoveryService,cacheService,ingestService}.ts`
- `backend/src/controllers/{searchController,sponsorsController,ingestController}.ts`
- `backend/src/middleware/{admin,verifyHmac,errorHandler,rateLimit}.ts`
- `backend/src/scoring/kidScore.ts` + `kidScore.test.ts`
- `backend/src/config/{env,logger,metrics}.ts`
- `backend/src/schemas/*.ts` (zod)
- `backend/db/migrations/003_composite_source_unique.sql`
- `backend/db/migrations/004_enrich_venues.sql`
- `backend/db/migrations/005_venue_types_dimension.sql`
- `backend/db/migrations/006_admin_audit_log.sql`
- `backend/scripts/seed-from-prototype.ts`
- `backend/scripts/backfill-enrichment.ts`
- `frontend/src/app/claim/[slug]/page.tsx`
- `frontend/src/app/sitemap-index.xml/route.ts`
- `frontend/src/components/map/venue-cluster-layer.tsx`
- `packages/shared/types.ts` (or `backend/src/types/venue.ts` re-exported to FE)
- `.github/workflows/{ci,ingest-google,ingest-osm,refresh-stale,datastore-monthly}.yml`
- `IMPROVEMENT_PLAN.md` (this file)

### Modified files
- `backend/src/routes/search.js` → thin router, logic moved into services
- `backend/src/routes/sponsors.js` → same
- `backend/src/server.js` → TS, pino, metrics, ready check, shared clients
- `backend/db/schema.sql` → updated search / dedup / scoring functions
- `backend/package.json` → deps + scripts (`"ingest:worker": "node dist/worker.js"`)
- `backend/Dockerfile.worker` → point to compiled TS entrypoint
- `docker-compose.yml` → remove stale env refs, add worker command
- `backend/.env.example` and root `.env.example` → add `BRAVE_API_KEY`, `INGEST_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `frontend/src/app/venue/[slug]/page.tsx` → richer JSON-LD, aggregate rating, opening hours
- `frontend/src/lib/api.ts` → import shared types, drop local duplicates
- `frontend/package.json` → Next 16, React 19, Tailwind 4, MapLibre 5
- `README.md` → reflect new CI badges, ingest architecture

### Removed files / sections
- References in docs to `OPENROUTER_API_KEY` (unless Phase P6 LLM scraper is adopted)
- `backend/scripts/cron-agent.js` (replaced by GitHub Actions + worker); keep a thin wrapper for manual runs if desired

---

## 7. Execution Timeline (suggested)

| Week | Phases | Deliverable |
|---|---|---|
| 1 | P0 | Production no longer has the worker crash loop, Brave bug, or admin bypass. |
| 2 | P1 | Layered TS backend, CI green, tests at >70 % line coverage on services. |
| 3 | P2 | `kid_score` persisted, Places (New) in use, ranking observably better. |
| 4 | P3 | All scraping driven by GitHub Actions; VPS cron removed. |
| 5–6 | P4 | SSR venue pages, sitemap-index, claim flow + Stripe live. |
| 7 | P5 | Next 16 / React 19 / Tailwind 4 upgrade merged. |
| 8+ | P6 | Opt-in items as analytics reveal need. |

Each phase is independently mergeable and reversible. Skip P6 entirely if no
gap shows up in the P4 analytics.

---

**Status:** ready for review. Move each phase into `.planning/phases/` as it
starts so `STATE.md` and `ROADMAP.md` stay authoritative.
