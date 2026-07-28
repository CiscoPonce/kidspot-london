# Phase 23: Public Launch Infrastructure, Security Hardening & AI Eval Benchmark — Discussion Log

**Date:** July 28, 2026

---

## Areas Discussed

### 1. Reverse Proxy & SSL Setup
- **Options Presented:**
  - Option A: Caddy — Automatic Let's Encrypt SSL, zero-config renewal, minimal Caddyfile.
  - Option B: Nginx + Certbot — Traditional Nginx reverse proxy with Certbot SSL.
- **User Feedback / Selection:** User noted: *"I will skip as I haven't purchase the domain"*.
- **Decision:** Prepare a ready-to-spin Caddy configuration (`scripts/caddy/Caddyfile`) and `docker-compose.prod.yml` template so HTTPS auto-provisions immediately once the domain (`kidspot.london`) is purchased and DNS A-records are configured.

### 2. Offsite Backup Storage
- **User Selection:** User confirmed: *"I have a bucket on Cloudflare R2 that I can use :)"*.
- **Decision:** Integrate Cloudflare R2 object storage into `scripts/backup.sh` using S3-compatible API credentials to replicate nightly 4:00 AM PostgreSQL database dumps.

### 3. AI Evaluation Benchmark & Analytics
- **Decision:** Lock in 50-item synthetic ground-truth dataset (`backend/evals/party_extraction_evals.jsonl`) and automated benchmark runner (`backend/scripts/eval-party-extraction.ts`). Integrate Plausible Analytics for tracking venue search clicks and shortlist saves.
