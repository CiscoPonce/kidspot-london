# Phase 07.5: Cleanup Sprint

## Phase Goal
Address lingering technical debt, expand test coverage, prepare the database schema for the revenue loop, and swap Google Places for a zero-cost Yelp Fusion waterfall before attempting Phase 8 framework upgrades. This significantly reduces the "blast radius" of major version bumps and sets up the revenue loop for success.

## Requirements
- **TS-01**: Convert `worker.js` to `worker.ts` and ensure all environment variables are correctly mapped.
- **TEST-02**: Expand test coverage to at least 40-50% for core routes and services.
- **DB-01**: Create database migrations for Phase 8 features (Stripe sponsorship tiers, claim statuses).
- **API-04**: Replace Google Places API with Yelp Fusion waterfall approach (OSM DB check -> Yelp Fusion API -> Redis cache).
- **VERIFY-01**: Complete Phase 7.5 verification and ensure the production baseline is completely stable.

## Context
Phase 7 successfully implemented many improvements, but left `worker.js` untyped, test coverage low (14 tests), and Phase 8's major framework upgrades (Node 22, Express 5, Next 16) pose a high risk of regressions. Additionally, moving away from Google Places to Yelp Fusion aligns with the project's zero-cost operation constraint. This sprint acts as a safety net.