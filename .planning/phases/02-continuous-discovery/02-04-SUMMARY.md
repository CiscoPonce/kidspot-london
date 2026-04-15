---
phase: 02-continuous-discovery
plan: 04
subsystem: discovery
tags: [venue-deactivation, audit, continuous-discovery]
dependency_graph:
  requires:
    - 02-01
  provides:
    - venue-deactivation
  affects:
    - backend/db/schema.sql
    - backend/scripts/cron-agent.js
tech_stack:
  added:
    - deactivation_log table
    - deactivate_venue function (enhanced with logging)
    - reactivate_venue function
    - test-deactivation.js
  patterns:
    - Audit trail via deactivation_log table
    - Reversible deactivation via reactivate_venue
key_files:
  created:
    - backend/scripts/test-deactivation.js
  modified:
    - backend/db/schema.sql
    - backend/scripts/cron-agent.js
decisions:
  - id: "02-04-D1"
    decision: "Added deactivation_log table for audit trail"
    rationale: "Threat model requires deactivation to be logged for auditability"
  - id: "02-04-D2"
    decision: "Added reactivate_venue function for reversibility"
    rationale: "Threat model requires deactivation to be reversible"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-15T12:08:00Z"
---

# Phase 02 Plan 04: Venue Deactivation Summary

## One-liner

Venue deactivation system with audit logging and reversible reactivation for permanently closed venues.

## What Was Built

Implemented venue deactivation for permanently closed venues with full audit trail and reversibility:

1. **deactivation_log table** - Audit table tracking all deactivation/reactivation events with reason, notes, timestamp, and user
2. **Enhanced deactivate_venue function** - Now logs deactivation with reason and notes for auditability
3. **reactivate_venue function** - Enables reversible deactivation when venues reopen
4. **Test script** - Comprehensive test suite validating all deactivation functionality

## Must-Haves Verification

### Truths

| Truth | Status |
|-------|--------|
| Permanently closed venues are detected via Google Places API | ✓ Implemented in cron-agent.js |
| Permanently closed venues are marked as inactive | ✓ deactivate_venue function |
| Inactive venues are excluded from search results | ✓ search_venues_by_radius has `WHERE v.is_active = TRUE` |
| Deactivation is reversible (venue can be reactivated) | ✓ reactivate_venue function added |
| Deactivation is logged for auditability | ✓ deactivation_log table added |

### Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Cron agent with venue deactivation | backend/scripts/cron-agent.js | ✓ Updated to pass reason/notes |
| Database schema with is_active field and index | backend/db/schema.sql | ✓ Enhanced with audit trail |

## Key Links

| From | To | Via | Pattern |
|------|----|-----|---------|
| backend/scripts/cron-agent.js | deactivate_venue function | SQL query | `SELECT deactivate_venue($1, $2, $3)` |
| backend/db/schema.sql | is_active index | CREATE INDEX | `CREATE INDEX idx_venues_active` |

## Deviations from Plan

None - plan executed as written. All tasks completed successfully.

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added audit logging to deactivate_venue**
- **Found during:** Task 1 review
- **Issue:** Threat model requires "Deactivation is logged for auditability" but function didn't log
- **Fix:** Added deactivation_log table and enhanced deactivate_venue to insert audit entry
- **Files modified:** backend/db/schema.sql
- **Commit:** 5e659b2

**2. [Rule 2 - Missing Critical Functionality] Added reactivate_venue function**
- **Found during:** Task 1 review
- **Issue:** Threat model requires "Deactivation is reversible (venue can be reactivated)" but no reactivation function existed
- **Fix:** Added reactivate_venue function that sets is_active = TRUE and logs the reactivation
- **Files modified:** backend/db/schema.sql
- **Commit:** 5e659b2

## Commits

| Hash | Type | Message |
|------|------|---------|
| 5e659b2 | feat | implement venue deactivation with audit logging |
| b917e32 | test | add venue deactivation test script |

## Test Validation

Run the test script to validate functionality:
```bash
node backend/scripts/test-deactivation.js
```

Tests verify:
1. Deactivation marks venue as inactive
2. Deactivation is logged for auditability
3. Inactive venues are excluded from search results
4. Venue can be reactivated
5. Reactivation is logged

## Threat Model Compliance

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-02-04-01 | Tampering | Deactivation is logged and reversible | ✓ Implemented |
| T-02-04-02 | Information Disclosure | Venue data is public information | ✓ Accepted |
