# Phase 09: Sponsorship & Revenue - Context

**Created:** 2026-05-02
**Status:** Planning

## Phase Boundary
This phase transitions KidSpot from a free utility to a sustainable commercial platform. By leveraging the "traffic proof" data collected in Phase 8.5, we will invite venue owners to claim their listings and upgrade to sponsorship tiers.

### Core Objectives:
1.  **Venue Claims**: Build a secure self-service flow for owners to verify their identity and take control of their KidSpot profile.
2.  **Stripe Integration**: Implement recurring subscriptions for Gold, Silver, and Bronze sponsorship tiers.
3.  **Owner Dashboard**: Provide owners with live metrics (clicks, views) to justify their investment.
4.  **Admin Governance**: Create tools for admins to approve claims and monitor for fraud.

## Success Criteria
- [ ] **Secure Onboarding**: 100% of claimed listings undergo email verification and admin approval.
- [ ] **Revenue Flow**: Successful integration of Stripe Checkout and Webhooks for tier upgrades.
- [ ] **Value Transparency**: Owners can see their "Traffic Proof" (outbound clicks) in a private dashboard.
- [ ] **Priority Sorting**: Sponsored venues correctly appear at the top of search results based on their tier.

## Technical Strategy
- **Authentication**: Use a lightweight, token-based verification for venue claims (email link).
- **Payments**: Standardize on Stripe Hosted Checkout to minimize PCI compliance burden.
- **Reporting**: Aggregate the `outbound_clicks` and `venue_views` (to be added) into a performant owner-facing API.
- **UI/UX**: Add "Is this your venue?" calls-to-action on all unclaimed detail pages.

## Key References
- `prposal.md` — Section P4 (Revenue Loop).
- `backend/db/migrations/006_revenue_schema.sql` — Existing schema for claim status and stripe IDs.
- `NEXT_ACTIONS.md` — Lead generation reporting status.
