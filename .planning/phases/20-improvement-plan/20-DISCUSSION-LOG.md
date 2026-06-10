# Phase 20: Improvement Plan - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 20-improvement-plan
**Areas discussed:** Image Enrichment, Council Hall-Hire Data, Pipeline Tuning, UX & Map

---

## Image Enrichment (1.2 Street View)

| Option | Description | Selected |
|--------|-------------|----------|
| Cache on VPS as static files | Works with existing infra, preserves Google attribution requirement | ✓ |
| Serve via Google CDN signed URLs | Saves VPS disk but needs CDN pass-through layer | |
| Other (specify) | User-provided approach | |

**User's choice:** Cache on VPS as static files
**Notes:** User selected the simpler VPS approach. Added: generic placeholder images by category for no-image venues; attribution compliance; monitor disk space after implementation (45.46 GB recently reclaimed).

## Council Hall-Hire Data Ingestion (1.3)

| Option | Description | Selected |
|--------|-------------|----------|
| All 33 London boroughs | Maximum coverage; more parser diversity needed | ✓ |
| Pilot 3-5 boroughs first | Faster delivery; validate before scaling | |
| Other (specify) | User-provided approach | |

**User's choice:** All 33 London boroughs

## PDF Parsing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| AI/LLM extraction | Uses existing NVIDIA/OpenRouter LLM pattern from Phase 18B | ✓ |
| Regex/table extraction | Only works for well-structured tables | |
| Other (specify) | User-provided approach | |

**User's choice:** AI/LLM extraction — leverage existing NVIDIA LLM `reasoning_content` pattern.

## Pipeline Tuning: BullMQ Concurrency

| Option | Description | Selected |
|--------|-------------|----------|
| Extend crawlDelay() utility in worker.ts | Single source of truth, aligns with existing pattern | ✓ |
| Per-job hard-coded limits | Faster to implement, less flexible | |
| Other (specify) | User-provided approach | |

**User's choice:** Extend `crawlDelay()` utility with per-queue concurrency map.

## PostGIS CLUSTER

| Option | Description | Selected |
|--------|-------------|----------|
| Include planned CLUSTER in this phase | One-shot operation; brief table lock but significant read speedup | ✓ |
| Defer to ops sprint | Schedule as standalone maintenance window | |
| Other (specify) | User-provided timing | |

**User's choice:** Include CLUSTER in this phase.

## UX & Map: Dynamic Map Bounds

| Option | Description | Selected |
|--------|-------------|----------|
| Fit-to-results with padding | Auto-adjusts to result set; best initial UX | |
| Preserve user viewport (Recommended) | Never moves map without user action; recenters only on new search | ✓ |
| Other (specify) | User-provided trigger logic | |

**User's choice:** Preserve user viewport; recenters only on new search submission.

## Map Re-center Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Only on new search submission | User types location → map zooms. Filter changes do not move map. | ✓ |
| On search + explicit "Fit results" button | Gives user control; more UX work | |
| Other (specify) | User-provided trigger logic | |

**User's choice:** Only on new search submission.

---

## Agent's Discretion

- **A-01:** Skeleton loader styling and shadow depth — agent chooses consistent with Phase 13/14 UI conventions.
- **A-02:** Council PDF parser structure (unified vs per-borough adapters) — agent decides after research.

## Deferred Ideas

None — discussion stayed within phase scope.
