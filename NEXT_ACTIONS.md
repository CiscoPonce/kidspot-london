# KidSpot London — Next Actions

**Active phases:** [23 — Public launch infrastructure](.planning/phases/23-public-launch-infrastructure-security-hardening-ai-eval-benc/23-CONTEXT.md) · [26 — Party Catering & Cake Policy Experience](.planning/phases/26-party-catering-cake-experience/26-CONTEXT.md)  
**State:** [.planning/STATE.md](.planning/STATE.md) · **Roadmap:** [.planning/ROADMAP.md](.planning/ROADMAP.md)  
**Last updated:** 18 Aug 2026

---

## Priority 1 — Go live (Phase 23)

These are the **infra tasks** for public domain launch:

1. **Point DNS** — `kidspot.london` A record → VPS public IP (`79.72.92.195`)
2. **Enable HTTPS** — remove `auto_https disable_redirects` from Caddy; add Let's Encrypt
3. **Offsite backups** — extend `scripts/backup.sh` to sync dumps to S3/R2

---

## Priority 2 — Phase 26: Catering, Cake Policy & Checklist

1. **Migration & Backend**: Add catering & kitchen columns (`039_add_party_catering_fields.sql`).
2. **Catering Extraction**: Add BYO food, cake policy, and kitchen detection to `partyExtraction.ts`.
3. **UI Badges**: Add "BYO Cake & Candles Welcome" & "BYO Food" badges to venue cards & detail pages.
4. **Party Checklist**: Interactive party planner widget on Shortlist and Saved pages.

---

## Priority 3 — Autonomous backfill (no action needed)

Phases 21 and 25 are **complete**. Worker + crons continue:

| Job | Rate | Target |
|-----|------|--------|
| `enrich-party-data` | ~200/day | party_capable 179 → 500+ |
| `enrich-google-places` | 12h, batch 25 | contact coverage |
| Discovery cron | daily 02:00 UTC | core growth |
| Brave images | when quota resets | 17% → 30%+ images |

Manual rerun: `bash scripts/run-phase-21.sh` on VPS.

---

## Priority 3 — Housekeeping

- Update GitHub `API_URL` if public IP changes
- Rotate Google Places API key if exposed
- Run smoke test: `bash scripts/smoke-test-all.sh`

---

## Quick commands (VPS)

```bash
cd /home/ubuntu/kidspot && source .env
export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"

# Health & perf
bash scripts/perf-check.sh
bash scripts/smoke-test-all.sh

# Backup
bash scripts/backup.sh

# Full Phase 21 pipeline (manual)
bash scripts/run-phase-21.sh

# Rebuild all containers
docker compose up -d --build
```

---

## Automated pipelines (GitHub Actions — all green)

| Workflow | Schedule (UTC) | Endpoint |
|----------|----------------|----------|
| Data Enrichment | Hourly | `POST /api/admin/ingest/enrichment` |
| Discovery | Daily 02:00 | `POST /api/admin/ingest/stale` |
| Party Discovery | Every 6h | `POST /api/admin/ingest/parties` |
| Venue Expansion | 06:00 & 18:00 | `POST /api/admin/ingest/expansion` |
| VPS DB Backup | Daily 04:00 | `scripts/backup.sh` (cron) |
