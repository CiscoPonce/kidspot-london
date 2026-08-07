# Phase 25 — Pre-Launch Hardening & Wave B Discovery

**Status:** 🔄 Active (started 7 Aug 2026)
**Depends on:** Phase 21 (catalogue maximisation), Phase 23 (infra gaps)
**Domain required:** No — all work runs on VPS IP until DNS is ready

## Goal

Ship the code and data improvements that don't need a domain: wire missing API routes, fix error handling, rebuild containers, and run Wave B discovery to grow the party catalogue.

## Why now

- Product is launch-ready; domain is optional for dev/data work
- FHRS + Prometheus routes exist but were never mounted (404 in smoke tests)
- Enrichment queues are empty — Wave B discovery is the next lever
- Worker was rebuilt 7 Aug; api/web were stale

## Scope

| In scope | Out of scope (deferred) |
|----------|-------------------------|
| Mount `/api/fhrs/match/:id` + `/metrics` | DNS + HTTPS (when domain purchased) |
| Fix 400 errors on empty POST bodies | Stripe monetisation (Phase 19) |
| Docker rebuild (api, web, worker) | Offsite S3/R2 backups |
| Wave B: Google Places discovery batch | Full git push (if credentials unavailable) |
| Smoke + perf verification | |

## Success criteria

- [ ] `GET /api/fhrs/match/:id` returns 200
- [ ] `GET /metrics` returns Prometheus text
- [ ] Empty-body POSTs return 400 not 500
- [ ] All 5 Docker containers healthy after rebuild
- [ ] `bash scripts/smoke-test-all.sh` passes (excluding concurrent admin lock tests)
- [ ] Wave B discovery discovers ≥ 1 new core venue (or logs "coverage sufficient")

## Plans

| Plan | Description | Status |
|------|-------------|--------|
| [25-01-PLAN.md](./25-01-PLAN.md) | API hardening — FHRS, metrics, 400 fixes | 🔄 |
| [25-02-PLAN.md](./25-02-PLAN.md) | Wave B discovery sweep | 🔄 |
| [25-03-PLAN.md](./25-03-PLAN.md) | Deploy, rebuild, verify | 🔄 |

---
*Last updated: 2026-08-07*
