---
phase: 17
plan: 01
subsystem: "backend"
tags: ["apify", "enrichment", "script", "discovery"]
dependency-graph:
  requires: ["db-venues"]
  provides: ["apify-enrichment-script"]
  affects: ["venues"]
tech-stack:
  added: []
  patterns: ["batch-processing", "api-integration"]
key-files:
  created:
    - "backend/scripts/discovery/sources/apify-enrichment.ts"
  modified: []
decisions:
  - "Implemented dummy execution logic for Apify Actor when APIFY_TOKEN includes 'dummy', as per prototype requirements."
metrics:
  duration: 15m
  completed-date: "2026-05-15"
---

# Phase 17 Plan 01: Apify Actor Integration Summary

## Objective
Implement a robust enrichment script using the Apify Google Maps Scraper to extract verified contact information for high-value venues.

## Summary of Work
- Created `apify-enrichment.ts` to query up to 20 high-value venues (softplay, leisure_centre, museum, library) missing website or phone details.
- Implemented dummy response generation when the environment variable `APIFY_TOKEN` is set to a dummy token, to bypass actual execution for the purpose of the prototype.
- Mapped Apify payload items to the `venues` table (`website`, `phone`, `rating`, `user_ratings_total`) and updated the `enriched_at` timestamp.
- Verified the script correctly identifies target venues and processes the dummy payload.

## Known Stubs
- Dummy execution is used inside `apify-enrichment.ts` when `APIFY_TOKEN` contains `dummy`. The live execution path using fetch remains intact for production.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | New Script: `apify-enrichment.ts` and Data Mapping | dfdd840 | `backend/scripts/discovery/sources/apify-enrichment.ts` |
