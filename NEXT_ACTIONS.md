# KidSpot London — Next Actions

**Active phase:** [25 — Pre-Launch Hardening & Wave B](.planning/phases/25-pre-launch-hardening-wave-b/25-CONTEXT.md) (+ Phase 21 data ops)
**State:** [.planning/STATE.md](.planning/STATE.md) · **Roadmap:** [.planning/ROADMAP.md](.planning/ROADMAP.md)
**Last updated:** 7 Aug 2026

---

## Priority 1 — Go live (Phase 23 gaps)

These block public launch even though the product is functionally ready:

1. **Point DNS** — `kidspot.london` A record → VPS public IP (`79.72.92.195` or Tailscale IP)
2. **Enable HTTPS** — remove `auto_https disable_redirects` from Caddy; add Let's Encrypt
3. **Mount missing API routes** — wire `/api/fhrs/match/:id` and `/metrics` in `server.ts`
4. **Push git** — 19 commits + Phase 24 uncommitted work on VPS only
5. **Offsite backups** — extend `scripts/backup.sh` to sync dumps to S3/R2

---

## Priority 2 — Phase 21 Wave B (catalogue depth)

Enrichment queues are **empty** (Aug 7 audit). Next gains need discovery, not re-running existing jobs:

1. Google Places **discovery sweep** — new venues by borough/query
2. Chain expansion via Google Places (replace Apify dependency)
3. Borough CSV audit + import — council hall contacts
4. Party extraction pass on newly discovered core venues
5. Wikimedia image enrichment script (exists, untracked)
6. Re-classify → dedup → backup after each bulk batch

**Targets:** party_capable ≥ 500 · core images ≥ 40% · listable core ≥ 2,000

---

## Priority 3 — Housekeeping

- Update GitHub `API_URL` variable if public IP changes
- Rebuild web/api containers to match worker (rebuilt 7 Aug)
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

# Manual enrichment (when queues have work)
cd backend && npx tsx scripts/discovery/sources/google-places-enrichment.ts 50
cd backend && npx tsx scripts/discovery/sources/party-data-enrichment.ts 50

# Rebuild all containers
cd /home/ubuntu/kidspot && docker compose up -d --build
```

---

## Automated pipelines (GitHub Actions — all green)

| Workflow | Schedule (UTC) | Endpoint |
|----------|------------------|----------|
| Data Enrichment | Hourly | `POST /api/admin/ingest/enrichment` |
| Discovery | Daily 02:00 | `POST /api/admin/ingest/stale` |
| Party Discovery | Every 6h | `POST /api/admin/ingest/parties` |
| Venue Expansion | 06:00 & 18:00 | `POST /api/admin/ingest/expansion` |
| VPS DB Backup | Daily 04:00 | `scripts/backup.sh` (cron) |
