---
gsd_state_version: 2.0
milestone: v1.0-public-launch
status: operating
current_phase: 23
last_updated: "2026-08-18T07:36:00.000Z"
progress:
  total_phases: 26
  completed_phases: 25
  active_phases: 1
  deferred_phases: 1
  percent: 98
---

# KidSpot London — Project State

> **Canonical state file.** Also mirrored at repo root `STATE.md`.
> Roadmap detail: [ROADMAP.md](./ROADMAP.md) · Next actions: [../NEXT_ACTIONS.md](../NEXT_ACTIONS.md)

## Current position

| Field | Value |
|-------|-------|
| **Active phases** | **23** only (DNS, HTTPS, offsite backups) |
| **Completed phases** | 01–18E, 20–22, 24, 25, **26 (Party Catering & Cake Experience)** |
| **Platform status** | **Production-ready on IP** — All product features complete; go-live needs domain |
| **Last VPS audit** | 18 Aug 2026 — all containers healthy, 65/65 tests pass, crons green |
| **Git** | Synced with `origin/master` |

### What's next

1. **Phase 23 (Launch Infra)**: Point DNS for `kidspot.london`, enable HTTPS, offsite backup sync.
2. **Phase 26 (Catering & Cake Experience)**: Add BYO food/cake policy transparency badges and interactive party planning checklist.

---

## Production snapshot (18 Aug 2026)

Live query against VPS Postgres after full Phase 21 pipeline + dedup:

| Metric | Value |
|--------|------:|
| Total venues | 16,941 |
| Active venues | 11,725 (post-dedup; 1,183 dupes merged) |
| **Core catalogue** (`venue_scope=core`) | **2,218** |
| **`party_capable` (core)** | **179** (8.1%) |
| Google-sourced (active) | 80+ |

**Phase 21 session:** Google Places ×10 · direct crawl ×5 · party extraction · Wave B ×13 · dedup 870 groups · borough CSV 843 matched.

**Core catalogue data quality:**

| Field | Coverage |
|-------|----------|
| Website | 79.2% (1,756/2,218) |
| Phone | 58.6% (1,299/2,218) |
| Images | 17.0% (377/2,218) — Brave 429 rate limit |
| Postcode | 99.1% (2,199/2,218) |

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
| **21** | **Party catalogue maximisation** | **✅ Complete** — worker backfill ongoing |
| 22 | Launch readiness (PWA, FHRS, cards) | ✅ Complete |
| 23 | Public launch infra & AI eval | **🔄 Active** |
| 24 | Frontend redesign & booking flow | ✅ Complete |
| 25 | Pre-launch hardening & Wave B | ✅ Complete |

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
| 2026-08-07 | **Phase 21 production push:** full pipeline + dedup (1,183 merged); core 2,218 · party 179 · smoke 30/32 pass |
| 2026-08-07 | Ops session: party extraction, borough CSV (843 matched), Wave B ×3 (+45, core→2,311); Phase 24+25 committed; git push resolved (`fe92c6e`) |
| 2026-08-07 | Wave B: 3 runs, +45 venues, core 2,236→2,310; free-tier limits applied |
| 2026-08-04 | Phase 24 frontend redesign deployed to VPS |
| 2026-07-28 | Phase 23 completed (4/4 plans) |
| 2026-07-08 | Phase 22 launch readiness verified (21/21 must-haves) |
| 2026-06-11 | DB rebuilt after Phase 20 volume incident |
