---
phase: 22
slug: launch-readiness
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
updated: 2026-07-08
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Revised to match actual plan task IDs, requirement assignments, and verify commands.**

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `backend/vitest.config.ts` |
| **Quick typecheck** | `cd backend && npx tsc --noEmit` (~15s) / `cd frontend && npx tsc --noEmit` (~15s) |
| **Quick unit tests** | `cd backend && npm test` (vitest run, ~30s) |
| **Full suite command** | `cd backend && npx tsc --noEmit && cd /home/ubuntu/kidspot/frontend && npx tsc --noEmit && cd /home/ubuntu/kidspot/backend && npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx tsc --noEmit` (backend tasks) or `cd frontend && npx tsc --noEmit` (frontend tasks) — matching the plan's `<verify>` command
- **After every plan wave:** Run `cd backend && npx tsc --noEmit && cd /home/ubuntu/kidspot/frontend && npx tsc --noEmit` then `cd /home/ubuntu/kidspot/backend && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | 22-D1, 22-D2 | T-22-01, T-22-03 | API key sent via header, not URL param; 500ms rate limit between calls | typecheck | `cd backend && npx tsc --noEmit` | ❌ Task creates files | ⬜ pending |
| 22-01-02 | 01 | 1 | 22-D3 | — | N/A (free public API, no auth) | typecheck | `cd backend && npx tsc --noEmit` | ❌ Task creates file | ⬜ pending |
| 22-01-03 | 01 | 1 | 22-D1, 22-D2, 22-D4 | T-22-02 | ON CONFLICT (source, source_id) prevents duplicate venue creation | typecheck | `cd backend && npx tsc --noEmit` | ❌ Task creates file | ⬜ pending |
| 22-02-01 | 02 | 1 | 22-F5 | T-22-04, T-22-05 | SW caches only public API data; no-cache headers prevent stale SW | typecheck | `cd frontend && npx tsc --noEmit && file public/icon-192x192.png public/icon-512x512.png` | ❌ Task creates files | ⬜ pending |
| 22-02-02 | 02 | 1 | 22-F5 | T-22-06 | beforeinstallprompt is browser-triggered, not page-triggered | typecheck | `cd frontend && npx tsc --noEmit` | ❌ Task modifies files | ⬜ pending |
| 22-03-01 | 03 | 1 | 22-T1 | T-22-07, T-22-10 | COALESCE/NULLIF write-safe pattern; >0.7 similarity threshold | typecheck | `cd backend && npx tsc --noEmit` | ❌ Task creates files | ⬜ pending |
| 22-03-02 | 03 | 1 | 22-T1 | T-22-07 | COALESCE/NULLIF pattern in batch UPDATE queries | typecheck | `cd backend && npx tsc --noEmit` | ❌ Task modifies file | ⬜ pending |
| 22-03-03 | 03 | 1 | 22-T1 | T-22-08, T-22-09 | FHRS data is public govt data; rate limited via global apiLimiter | typecheck | `cd backend && npx tsc --noEmit && cd /home/ubuntu/kidspot/frontend && npx tsc --noEmit` | ❌ Task creates files | ⬜ pending |
| 22-04-01 | 04 | 1 | 22-F1 | — | N/A (layout-only change, no data handling) | typecheck | `cd frontend && npx tsc --noEmit` | ❌ Task modifies file | ⬜ pending |
| 22-04-02 | 04 | 1 | 22-F2, 22-F3, 22-F4, 22-T2, 22-I2, 22-I3 | T-22-11, T-22-12, T-22-13 | localStorage same-origin only; slug validation regex; StorageEvent cross-tab only | manual | human-check (see plan) | ✅ All files exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test stubs needed — the project has vitest 4.x configured for backend tests. Plans use `npx tsc --noEmit` as the primary automated verification gate for each task.

**Remaining gaps (all acceptable for this phase):**
- No frontend test infrastructure exists (0 test files in `frontend/src/`) — this is a pre-existing condition; plans are verified by TypeScript compilation
- Data sweep scripts are CLI-only, no automated test coverage — verified by manual trigger post-deployment
- PWA install prompt behavior is manual-only — requires browser `beforeinstallprompt` event which cannot be automated in vitest

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA install prompt UI | 22-F5 | Requires browser install flow | Open in Chrome DevTools → Application → Manifest → verify install prompt fires |
| FHRS score display on detail page | 22-T1 | Visual rendering on venue detail page | Navigate to venue with FHRS match → verify score badge renders |
| Mobile-first card layout | 22-F1 | Visual regression check | Open in mobile viewport (375px) → verify party info hierarchy |
| Data sweep execution | 22-D1, D2, D3, D4 | Requires live API keys and DB | Run `npx tsx backend/scripts/discovery/data-max-runner.ts` and verify logs |
| Existing F2-F4 / T2 / I2-I3 features | 22-F2, F3, F4, T2, I2, I3 | Code audit (files already exist) | Review each source file per Plan 04 Task 2 verification checklist |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Human-check (Wave 0 covers manual-only items)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
