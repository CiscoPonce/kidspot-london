# Phase 22: Launch Readiness — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-08
**Phase:** 22-launch-readiness
**Areas discussed:** Real scope audit, Card redesign, Shortlist/Compare UX, PWA approach, FHRS matching & display, Data provenance, Infra hardening, Data Max scope, Data Max sequencing, PWA caching

---

## Real Scope Audit

| Option | Description | Selected |
|--------|-------------|----------|
| PWA + FHRS matching + Infra | Focus on PWA, FHRS batch job, infra only | |
| Redesign existing + PWA + Infra | Redo listing cards, add PWA, FHRS, provenance, infra | ✓ |
| Full scope as planned | Treat everything as needing work | |

**User's choice:** Redesign existing + PWA + Infra
**Notes:** ~60% of ROADMAP features already exist. Focus on what's truly remaining.

---

## Card Redesign Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-first party focus | Re-prioritize for party decisions — bigger price/capacity, quicker CTA | ✓ |
| Full card redesign | New design, different visual hierarchy | |
| Incremental polish | Minor tweaks only | |

**User's choice:** Mobile-first party focus
**Notes:** Keep existing info but re-prioritize hierarchy for party decision-making.

---

## Shortlist/Compare UX

| Option | Description | Selected |
|--------|-------------|----------|
| Polish existing page | Current compare-table view with export/share buttons | ✓ |
| Full compare dashboard | Dedicated page with saved list, compare toggle, sharing controls | |

**User's choice:** Polish existing page

---

## PWA Approach

| Option | Description | Selected |
|--------|-------------|----------|
| next-pwa plugin | Simplest, handles SW generation | |
| Workbox manual SW | More control, heavier setup | |
| Manual SW + config | Custom service worker + next.config.js headers | ✓ |

**User's choice:** Manual SW + config
**Notes:** Full control, appropriate for this app's needs.

---

## PWA Offline Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal offline | App shell + manifest only | |
| Cached search results | Cache recent searches + venue detail pages | ✓ |
| Full offline catalog | Pre-cache entire venue catalog | |

**User's choice:** Cached search results

---

## PWA Caching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Cache search results only | Network-first search, cache fallback | |
| Cache venue detail pages only | Cache-first for visited detail pages | |
| Cache both | Search (network-first) + detail (cache-first) | ✓ |
| Cache shell + search only | Minimal strategy | |

**User's choice:** Cache both

---

## FHRS Matching

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated FHRS batch job | BullMQ job matching by name+postcode, runs weekly | |
| On-demand matching | Match when detail page is viewed (lazy) | |
| Hybrid | Batch background + lazy on-demand | ✓ |

**User's choice:** Hybrid

---

## FHRS Score Display

| Option | Description | Selected |
|--------|-------------|----------|
| Badge only | Keep existing badge, link to FHRS | |
| Inline score badge | Show 0-5 rating on card with FHRS logo | |
| Detail page only | Show score on venue detail page, keep badge on cards | ✓ |

**User's choice:** Detail page only

---

## Data Provenance (T2)

| Option | Description | Selected |
|--------|-------------|----------|
| Current trust signals only | FHRS + owner-verified + accessibility. Keep as-is | ✓ |
| Add data source badges | Show where data came from (council, Google, OSM) | |

**User's choice:** Current trust signals only

---

## SSL/HTTPS

| Option | Description | Selected |
|--------|-------------|----------|
| Caddy | Continue with Caddy reverse proxy per Phase 20 plan | |
| Nginx | Traditional choice, more manual setup | |

**User's choice:** Deferred until domain is ready
**Notes:** User explicitly said to keep as-is until the product is ready.

---

## Infra Hardening

| Option | Description | Selected |
|--------|-------------|----------|
| CORS + rate limiting only | Lock CORS to production domain, set Express rate limits | ✓ |
| Full lockdown | CORS + rate limiting + fail2ban + Helmet.js | |

**User's choice:** CORS + rate limiting only

---

## Data Max Scope

| Option | Description | Selected |
|--------|-------------|----------|
| In Phase 22 scope | Include data sweeps in this phase | ✓ |
| Defer to Phase 21 | Phase 21 covers data maximisation | |

**User's choice:** In Phase 22 scope

---

## Data Max Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Image enrichment first | Brave/Street View backfill first | |
| Google Places discovery first | Find new venues first | |
| Chain expansion + postcodes.io first | Fix existing data gaps first | |
| Parallel where possible | Run independent sweeps concurrently | ✓ |

**User's choice:** Parallel where possible

---

## Agent's Discretion

- Specific mobile card layout changes (vertical vs horizontal, exact info hierarchy)
- Service worker implementation details (cache names, versioning, cleanup)
- FHRS batch job scheduling frequency and matching threshold
- Rate limiting thresholds

## Deferred Ideas

- SSL/HTTPS — deferred until domain is registered
- fail2ban — not needed at current scale
- Data source provenance badges — out of scope
- Full compare dashboard — polish existing instead
