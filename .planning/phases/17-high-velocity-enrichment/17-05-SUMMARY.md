# Summary 17-05: Asynchronous Webhooks & Deep Enrichment

## Objective
Replace the synchronous API polling mechanism with an asynchronous webhook architecture to save compute resources, and enable deep website crawling to capture owner emails.

## Accomplishments
- **Webhook Service Implementation**: Created `backend/src/services/apifyService.ts` to process Apify datasets, including mapping for `opening_hours`, `images`, and `email`.
- **Webhook Endpoint**: Added `POST /api/admin/webhooks/apify` to `backend/src/routes/admin.ts` with secret token security.
- **Trigger Logic Update**: Modified `backend/scripts/discovery/sources/apify-enrichment.ts` to include webhook configuration and enable `scrapeCompanyWebsite: true`.
- **Search Tagging**: Used `#ID:venue_id` suffix in search strings for deterministic matching upon result retrieval.

## Verification
- Verified webhook security and dataset processing logic.
- Pipeline verified in dummy mode to update `opening_hours`, `images`, and `email` fields.
