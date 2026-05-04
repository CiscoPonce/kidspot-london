# KidSpot London

**KidSpot London** is a hyper-local search engine that helps parents find
genuinely good places for their kids — soft play, parks, museums, party
rooms, libraries — across all 33 London boroughs. It blends curated public
datasets, an agentic discovery pipeline, and on-demand venue enrichment to
keep the directory fresh without manual upkeep.

> **Active phase: 11 — Search Experience V2** (Stitch-based mobile + desktop
> redesign, ships in two waves). See
> [`.planning/phases/11-search-experience-v2/11-CONTEXT.md`](.planning/phases/11-search-experience-v2/11-CONTEXT.md)
> for the current plan and design references.

---

## Key features

- **Hyper-local search** — postcode or geolocation, 1–10 mile radius slider,
  spatial PostGIS queries, MapLibre GL JS map.
- **Five canonical categories** — Soft Play, Parks, Museums, Party Rooms,
  Libraries. The chip strip and result cards are colour-coded per category
  for fast scanning.
- **Agentic discovery** — nightly OpenStreetMap (Overpass) sync, Yelp
  Fusion enrichment, BullMQ-driven background discovery for stale venues,
  Brave Search as a *true* last-resort fallback (only when both the local
  DB and OSM return zero real venues, with listicle / aggregator titles
  filtered out).
- **Owner & sponsor stack** — claim flow with email verification, Stripe
  subscriptions for Gold / Silver / Bronze tiers, premium ranking with
  hourly rotation, and an owner dashboard with click + impression analytics.
- **Programmatic SEO** — borough and category landing pages, sitemap, OG
  metadata for every venue.
- **Mobile-first, responsive** — image-top cards on phones, 50/50 map +
  results split on desktop, floating "View Map" pill above the bottom nav.
- **Privacy-first analytics** — Plausible only.

---

## Stack

### Frontend
- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS 3.4 + Material Symbols Outlined
- **Maps**: MapLibre GL JS 4
- **Data fetching**: TanStack React Query 5
- **Notifications**: Sonner
- **Analytics**: Plausible

### Backend
- **Runtime**: Node.js 22, Express 5 (run via `tsx`)
- **Database**: PostgreSQL 15 + PostGIS (`ST_DWithin`, `ST_MakePoint`)
- **Cache + queue**: Redis 7, BullMQ
- **Logging / security**: Pino, Helmet, Redis-backed `express-rate-limit`
- **Payments**: Stripe SDK
- **Process mgmt**: PM2 cluster mode in production

### Infrastructure
- **Orchestration**: Docker Compose on an ARM VPS
- **CI / cron**: GitHub Actions (cron-driven discovery via signed HMAC
  POSTs to `/api/admin/ingest/stale`)

---

## Quick start

### Prerequisites
- Docker + Docker Compose
- API keys (in `.env`):
  - `BRAVE_API_KEY` — fallback search
  - `YELP_API_KEY` + `YELP_CLIENT_ID` — venue enrichment
  - `ADMIN_KEY` — protects `/api/admin/*`
  - `INGEST_SIGNING_SECRET` — HMAC for cron-driven ingestion
  - `STRIPE_SECRET_KEY` (optional) — only needed if you want billing live

### Run

```bash
git clone https://github.com/CiscoPonce/kidspot-london.git
cd kidspot-london
cp .env.example .env             # fill in the keys above
docker compose up -d              # postgres, redis, api, worker, web
```

Then:

| Service | URL |
|---|---|
| Web | <http://localhost:3005> |
| API | <http://localhost:4000> |
| Health | <http://localhost:4000/health> · <http://localhost:4000/ready> |

### Useful endpoints

```bash
# Spatial search
curl "http://localhost:4000/api/search/venues?lat=51.54297&lon=0.012152&radius=5&type=softplay&limit=24"

# Sitemap
curl http://localhost:3005/sitemap.xml

# Liveness / readiness
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

---

## Project structure

```
.
├── backend/                  Express API + BullMQ worker (TypeScript, tsx)
│   ├── db/migrations/        Sequential .sql migrations (latest: 012)
│   ├── src/
│   │   ├── routes/           sponsors, search, admin, claim, billing, owner
│   │   ├── services/         venueService, claimService, revenueService, …
│   │   ├── controllers/      thin HTTP layer
│   │   └── tests/            vitest unit + integration tests
│   └── scripts/              one-off ops scripts (discovery, backfill, …)
├── frontend/                 Next.js 16 App Router
│   └── src/
│       ├── app/              routes (search, venue/[slug], owner/, admin/)
│       ├── components/       layout, search, venues, modals, map
│       └── lib/              api client, constants, hooks
├── docs/                     Long-form product / technical docs (+ archive/)
├── .planning/                Live phase plans, state, roadmap, design refs
│   ├── phases/               One folder per phase (XX-CONTEXT.md, XX-NN-PLAN.md)
│   ├── design-refs/          Stitch designs + brand-corrected HTML / images
│   ├── archive/              Snapshots from completed phases
│   ├── PROJECT.md            North-star product framing
│   ├── ROADMAP.md            Phase-by-phase roadmap
│   └── STATE.md              Current position + recent decisions
├── prposal.md                Master improvement plan (cited by phases)
├── technical_overview.md     Architecture deep-dive
├── docker-compose.yml        Postgres, Redis, API, Worker, Web
├── NEXT_ACTIONS.md           Short list of the next concrete steps
└── README.md
```

---

## Discovery pipeline

```
GitHub Actions (cron) ──HMAC──▶ /api/admin/ingest/stale
                                         │
                                         ▼
                              BullMQ "discovery" queue
                                         │
                            ┌────────────┴───────────┐
                            ▼                        ▼
                  fetchOsmSearchResults     fetchBraveSearchResults
                  (Overpass: leisure=        (only when DB+OSM = 0,
                   indoor_play, plus named   listicle / aggregator
                   leisure centres for       titles filtered out)
                   softplay)
                            │
                            └─────► PostgreSQL (deduped via
                                    insert_venue_if_not_duplicate)
```

Brave fallback is intentionally narrow: it only fires when the local DB
*and* OSM both returned zero real venues, and even then drops obvious SEO
listicles ("Top 10 …", "Best of … 2026", multi-clause `|`-separated
titles, known aggregator domains).

---

## Security & performance

- **Helmet** with a strict CSP allow-list (`api.search.brave.com`,
  `places.googleapis.com`, `overpass-api.de`, `maps.googleapis.com`).
- **Rate limiting** is Redis-backed (`express-rate-limit`), 60 req/min by
  default and stricter on admin / claim endpoints.
- **Caching**: 1 h Redis cache for search responses and venue details, with
  cache busting on ingest.
- **Production**: PM2 cluster mode for the Web app, dedicated Worker
  container for BullMQ, deep `/ready` health check that verifies both
  Postgres and Redis.

---

## Testing

```bash
# Backend
docker compose exec api npx vitest run
docker compose exec api npm run lint
docker compose exec api npm run typecheck

# Frontend
docker compose exec web npm run lint
docker compose exec web npx tsc --noEmit
```

---

## Contributing

1. Read [`.planning/STATE.md`](.planning/STATE.md) for the current phase
   and decisions log.
2. Pick a plan from
   [`.planning/phases/`](.planning/phases/) — e.g.
   [`11-search-experience-v2/`](.planning/phases/11-search-experience-v2/).
3. Branch off `master`, follow the conventional-commit style already in
   `git log` (`feat:`, `fix:`, `chore:`, `docs:`, scoped where useful:
   `feat(phase-11):`, `fix(search):`).
4. Open a PR — CI runs lint + typecheck for both apps.

---

## License

MIT — see [`LICENSE`](LICENSE).
