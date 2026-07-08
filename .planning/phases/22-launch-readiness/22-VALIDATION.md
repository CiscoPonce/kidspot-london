---
phase: 22
slug: launch-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-08
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npx jest --bail --passWithNoTests` |
| **Full suite command** | `cd backend && npx jest --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --bail --passWithNoTests`
- **After every plan wave:** Run `cd backend && npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | 22-F5 | T-22-01 / — | N/A | unit | `npx jest --bail --passWithNoTests` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | 22-F1 | — | N/A | unit | `npx jest --bail --passWithNoTests` | ✅ | ⬜ pending |
| 22-01-03 | 01 | 1 | 22-T1 | — | N/A | unit | `npx jest --bail --passWithNoTests` | ✅ | ⬜ pending |
| 22-01-04 | 01 | 1 | 22-D1..D4 | — | N/A | unit | `npx jest --bail --passWithNoTests` | ✅ | ⬜ pending |
| 22-01-05 | 01 | 1 | 22-I2..I3 | T-22-02 | CORS + rate limiting enforced | unit | `npx jest --bail --passWithNoTests` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test stubs needed — the project has Jest 29.x configured for backend tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA install prompt UI | 22-F5 | Requires browser install flow | Open in Chrome DevTools → Application → Manifest → verify install prompt fires |
| FHRS score display on detail page | 22-T1 | Visual rendering on venue detail page | Navigate to venue with FHRS match → verify score badge renders |
| Mobile-first card layout | 22-F1 | Visual regression check | Open in mobile viewport (375px) → verify party info hierarchy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
