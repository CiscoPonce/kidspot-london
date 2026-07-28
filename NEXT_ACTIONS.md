# KidSpot London — Next Actions

**Active plan:** [Phase 21 — Party Catalogue Maximisation](.planning/phases/21-party-catalogue-maximisation/21-PLAN.md)

**Goal:** Maximise hireable venues and softplay for kids’ birthdays in Greater London.

## This week (Wave A — no new code)

1. Run Google Places enrichment until queue empty (~40×50 batches)
2. Run direct website crawl + party extraction on all core venues with websites
3. Audit borough CSV feeds and import new council hall data
4. Re-classify → dedup → backup → update metrics in `.planning/STATE.md`

## Next (Wave B — small builds)

1. Google Places discovery sweep (new venues by borough/query)
2. Chain expansion via Google (replace Apify)
3. postcodes.io geocoding (fix postcode backlog)

## Quick commands (VPS)

```bash
cd /home/ubuntu/kidspot && source .env
export DATABASE_URL="postgres://kidspot_admin:${DB_PASSWORD}@127.0.0.1:5432/kidspot"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379"

bash scripts/backup.sh
cd backend && npx tsx scripts/discovery/sources/google-places-enrichment.ts 50
```

See full step-by-step in the Phase 21 plan.
