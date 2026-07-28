# Phase 23: Public Launch Infrastructure, Security Hardening & AI Eval Benchmark — Context

**Gathered Date:** July 28, 2026  
**Phase Directory:** `.planning/phases/23-public-launch-infrastructure-security-hardening-ai-eval-benc/`

---

## 🎯 Domain Boundary & Goal

Package the platform for public adoption in London by creating a ready-to-spin Caddy reverse proxy SSL template for when the domain is purchased, integrating **Cloudflare R2** offsite database backup replication, formalizing the **AI evaluation benchmark & logging**, and adding SEO/analytics capabilities.

---

## 🔒 User Decisions & Choices

### 1. Reverse Proxy & SSL Setup
- **Domain Status:** Public domain (`kidspot.london`) purchase pending.
- **Approach:** Prepare a production-ready Caddy configuration (`scripts/caddy/Caddyfile`) and `docker-compose.prod.yml`.
- **SSL Automation:** When DNS A-records are pointed to VPS IP `79.72.92.195`, launching Caddy will automatically issue and manage Let's Encrypt / ZeroSSL HTTPS certificates for `kidspot.london` and `api.kidspot.london` with automatic renewal.

### 2. Offsite Backup Replication (Cloudflare R2)
- **Storage Target:** User's Cloudflare R2 object storage bucket.
- **Implementation:** Enhance `scripts/backup.sh` using S3-compatible API credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
- **Automation:** Nightly 4:00 AM cron dumps compress PostgreSQL PostGIS `.dump` files, upload to Cloudflare R2, and maintain a 30-day rolling retention policy.

### 3. AI Evaluation Benchmark & LLM Tracing
- **Ground-Truth Dataset:** Expand `backend/evals/party_extraction_evals.jsonl` to 50 ground-truth test cases across venue types (soft play, leisure centers, halls, museums, non-party sites).
- **Automated Runner:** `npm run eval:party` executing `backend/scripts/eval-party-extraction.ts` to measure extraction precision/recall.
- **LLM Tracing:** Add Pino structured logging for NVIDIA LLM prompts, token usage, regex fallbacks, and schema validation.

### 4. SEO & Privacy Analytics
- **Analytics:** Plausible Analytics integration for privacy-friendly tracking of venue selections, shortlist saves, and party enquiry clicks.
- **SEO:** Programmatic `sitemap.xml` covering all 33 London Borough landing pages (`/venues-in/[borough]`) and standard `robots.txt`.

---

## 📚 Canonical References

- [ROADMAP.md](../../ROADMAP.md) — Phase 23 goal & requirements
- [STATE.md](../../STATE.md) — Project state & database status
- [project_analysis.md](../../../../.gemini/antigravity-cli/brain/1532d1c5-794c-4a58-9f23-bd246e5fa9dc/project_analysis.md) — Architectural analysis report
- [eval-party-extraction.ts](../../backend/scripts/eval-party-extraction.ts) — AI benchmark runner script
- [party_extraction_evals.jsonl](../../backend/evals/party_extraction_evals.jsonl) — Synthetic ground-truth dataset

---

## 🛠️ Codebase Context & Assets

- **Backup Script:** `scripts/backup.sh` (to be enhanced with Cloudflare R2 upload)
- **Worker & Scraper:** `backend/src/utils/partyExtraction.ts` & BullMQ worker engine
- **Frontend Venue Card:** `frontend/src/components/venues/venue-card.tsx` (with image `onError` fallback)
