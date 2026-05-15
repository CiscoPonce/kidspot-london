# Phase 17 Context

## Background
We need to rapidly enrich venue data using Apify.

## Decisions
- Use Apify actor compass~crawler-google-places.
- Use asynchronous webhooks.
- Store opening_hours as JSONB and images as TEXT[].