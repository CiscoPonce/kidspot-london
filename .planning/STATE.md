---
gsd_state_version: 2.0
milestone: v1.0-public-launch
status: operating
current_phase: 25
last_updated: "2026-08-07T23:00:00.000Z"
progress:
  total_phases: 25
  completed_phases: 22
  active_phases: 2
  deferred_phases: 1
  percent: 92
---

# KidSpot London — Project State

> **Canonical state file.** Also mirrored at repo root `STATE.md`.
> Roadmap detail: [ROADMAP.md](./ROADMAP.md) · Next actions: [../NEXT_ACTIONS.md](../NEXT_ACTIONS.md)

## Current position

| Field | Value |
|-------|-------|
| **Active phases** | **21** (catalogue depth) + **25** (pre-launch hardening) |
| **Platform status** | **Launch-ready** — product complete; catalogue depth + DNS/HTTPS remain |
| **Last VPS audit** | 7 Aug 2026 — all containers healthy, 51/51 tests pass, crons green |
| **Uncommitted work** | None — Phase 24 + 25 committed and pushed |

### What we're doing now (Phase 21)

Enrichment queues have **caught up** on current criteria. Focus shifts to **Wave B**:

1. Google Places **discovery sweep** (new venues by borough)
2. Chain expansion via Google Places
3. Borough CSV hall-hire contact ingest
4. Raise `party_capable` coverage (182 → target 500+)

Go-live blockers (tracked under Phase 23 gaps):

- DNS for `kidspot.london` not pointed at VPS
- HTTPS disabled in Caddy (`auto_https disable_redirects`)
- Offsite backup replication (S3/R2) not configured

---

## Production snapshot (7 Aug 2026, post–Wave B)

Live query against VPS Postgres after 3 Wave B discovery runs + re-classify:

| Metric | Value |
|--------|------:|
| Total venues | 16,751 |
| Active venues | 16,033 |
| **Core catalogue** (`venue_scope=core`) | **2,311** |
| **`party_capable` (core)** | **182** (7.9%) |
| Google-sourced (active) | 80+ |

**Wave B sessions (6 runs total):** +90 discovered · +75 core after classify · ~34 API searches (free tier safe).

**Latest ops session (7 Aug evening):** party extraction (9 processed, 0 new party-capable) · borough CSV (843 matched) · Wave B ×3 (+45 discovered, +1 core).

**Core catalogue data quality** (unchanged — re-run enrichment-stats for live %):

| Field | Coverage |
|-------|----------|
| Website | ~78.6% |
| Phone | ~57.5% |
| Images | ~16.9% |

---

## Phase status at a glance

| Phase | Name | Status |
|------:|------|--------|
| 01–07 | Data foundation → improvement | ✅ Complete |
| 08.5 | UX & data quality | ✅ Complete |
| 09–10 | Revenue & sponsor features | ✅ Complete |
| 11–16 | Scale, enrichment, partnerships | ✅ Complete |
| 17 | High-velocity enrichment (Apify) | ✅ Complete |
| 18 | Autonomous enrichment engine | ✅ Complete |
| 18B | Contact extraction yield (NVIDIA LLM) | ✅ Complete |
| 18C | Party-first frontend & PWA | ✅ Complete |
| 18D | Party data extraction | ✅ Complete |
| 18E | Dedup & search ranking hotfix | ✅ Complete |
| 18.5 | Chain enrichment | ✅ Complete |
| 19 | Revenue monetisation V2 | ⏸️ Deferred |
| 20 | Security, backups, Google Places | ✅ Complete |
| **21** | **Party catalogue maximisation** | **🔄 Active** |
| 22 | Launch readiness (PWA, FHRS, cards) | ✅ Complete |
| 23 | Public launch infra & AI eval | ⚠️ Mostly complete |
| 24 | Frontend redesign & booking flow | ✅ Complete (uncommitted) |

### Phase 23 remaining gaps

| Item | Status |
|------|--------|
| AI eval benchmark (`eval:party`) | ✅ Done |
| OpenAPI spec | ✅ Done |
| Prometheus `/metrics` | ✅ Mounted and live |
| FHRS lazy API | ✅ Mounted — `GET /api/fhrs/match/:id` |
| Caddy reverse proxy config | ✅ Done (port 80) |
| DNS + Let's Encrypt HTTPS | ❌ Not done |
| Offsite backup replication (S3/R2) | ❌ Not done |
| GitHub `API_URL` | ⚠️ Old public IP (still works) |

---

## Infrastructure health (7 Aug 2026)

| Component | Status |
|-----------|--------|
| Docker: api, web, worker, postgres, redis | ✅ All healthy |
| Worker container | ✅ Rebuilt 7 Aug (was 8 weeks stale) |
| BullMQ repeatable jobs | ✅ 42 registered |
| VPS daily backup cron | ✅ 04:00 UTC → `/home/ubuntu/backups/` |
| GitHub: Data Enrichment (hourly) | ✅ 22/24 success last 24h |
| GitHub: Discovery (daily 02:00) | ✅ Success today |
| GitHub: Party Discovery (6h) | ✅ Success today |
| GitHub: Venue Expansion (12h) | ✅ Success today |

---

## Recovery notes (do not repeat)

- **Jun 9 2026:** Phase 20 `docker system prune --volumes` wiped production DB
- Always verify backup dump size (expect **≥ 1 MB**, currently ~2.4 MB) before infra changes
- Use `scripts/rebuild-catalog.sh` and `scripts/run-enrichment-pipeline.sh` for full rebuilds
- DB rebuilt Jun 11; catalogue structure recovered, depth rebuilt since

---

## Tech stack (current)

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, React 19, Tailwind 3.4, MapLibre GL, TanStack Query, PWA |
| Backend | Node.js 22, Express 5, TypeScript, Pino |
| Data | PostgreSQL 15 + PostGIS, Redis 7, BullMQ |
| AI / APIs | NVIDIA LLM, Brave, Google Places, Foursquare, Geoapify, Apify, FHRS |
| Deploy | Docker Compose on ARM VPS, Caddy, GitHub Actions crons |

---

## Session log

| Date | Event |
|------|-------|
| 2026-08-07 | Ops session: party extraction, borough CSV (843 matched), Wave B ×3 (+45, core→2,311); Phase 24+25 committed |
| 2026-08-07 | Wave B: 3 runs, +45 venues, core 2,236→2,310; free-tier limits applied |
| 2026-08-04 | Phase 24 frontend redesign deployed to VPS |
| 2026-07-28 | Phase 23 completed (4/4 plans) |
| 2026-07-08 | Phase 22 launch readiness verified (21/21 must-haves) |
| 2026-06-11 | DB rebuilt after Phase 20 volume incident |
