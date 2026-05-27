# Phase 18: Data Validation & Rich Media

## Objective
Establish a high-trust database by systematically validating venue operational status (detecting closures), acquiring rich visual media (photos), and completing missing contact data (emails, phones) for all 16,800+ venues.

## Key Files & Context
- `backend/scripts/discovery/sources/apify-enrichment.ts`: Main tool for high-quality Google Places data.
- `backend/scripts/discovery/sources/direct-crawl-enrichment.ts`: Tool for extracting emails and phone numbers directly from websites.
- `backend/src/services/venueService.ts`: Core logic for serving and merging venue data.
- `backend/src/worker.ts`: Background job orchestration.

## Implementation Steps

### 1. Systematic Closure Detection
**Goal**: Identify and deactivate venues that are permanently closed.
- **Backend**: Implement a "Status Check" job that utilizes Google Places (via Apify) to check the `permanently_closed` status.
- **Database**: Add a `permanently_closed` flag or update `is_active` based on authoritative feedback.
- **Workflow**: Create a report of all venues marked inactive for manual review.

### 2. Rich Media Acquisition Engine
**Goal**: Ensure every venue has at least 1-3 high-quality images.
- **Backend**: Update the Apify enrichment pipeline to prioritize image extraction for venues with `images = '{}'`.
- **Backend**: Implement a fallback image fetcher using Brave Search API (Image search) for venues not on Google Places.
- **Frontend**: Update the image gallery component to handle multiple images and provide better fallbacks.

### 3. Contact Data Gap Backfill
**Goal**: Fill the remaining gaps in emails and phone numbers.
- **Backend**: Run a specialized "Deep Crawl" sweep on all venues that have a `website` but no `email`.
- **Backend**: Implement a "Phone Normalization" pass to ensure all phone numbers are in a standard, clickable format for mobile users.

### 4. Verification UI & Trust Badges
**Goal**: Visually communicate data quality to users.
- **Frontend**: Add a "Last Verified" timestamp to venue detail pages.
- **Frontend**: Implement a "Report a Problem" button on every venue to crowd-source closure reports.

## Verification & Testing
- **Scripted Check**: Run `coverage-eval.ts` to measure the increase in venues with valid emails, phones, and images.
- **Database Query**: Compare the number of venues with `images` before and after the acquisition engine runs.
- **Manual QA**: Spot-check 20 venues marked as "Verified" to ensure operational status and media accuracy.
