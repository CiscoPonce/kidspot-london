# Phase 10: Sponsor Features & Engagement - Context

**Created:** 2026-05-02
**Status:** Planning

## Phase Boundary
This phase focuses on delivering the promised value to our sponsors. Now that we can collect revenue (Phase 09), we must ensure that sponsors get the visibility and data they paid for. We will build the private owner dashboards and implement the ranking algorithms that prioritize paid listings.

### Core Objectives:
1.  **Featured Ranking**: Implement the backend sorting logic to ensure Gold, Silver, and Bronze sponsors appear at the top of search results.
2.  **Sponsor Dashboard**: Build a private portal for verified owners to view their specific lead generation metrics (clicks, views).
3.  **Enhanced Profiles**: Allow sponsors to manage more of their listing details (images, amenities) which are normally locked for organic listings.
4.  **Notification System**: Notify owners when their sponsorship is active and when they receive significant traffic.

## Success Criteria
- [ ] **Priority Sorting**: In any search result, Gold sponsors occupy the top 3 spots, Silver the next 2, followed by Bronze and organic results.
- [ ] **Transparency**: 100% of sponsors can log in and see their click-through rate (CTR) for the last 30 days.
- [ ] **Self-Service**: Sponsors can update their primary photo without admin intervention.

## Technical Strategy
- **Authentication**: Extend the claim token system into a persistent "Owner Session" or integrate a lightweight auth provider (e.g. NextAuth or simplified JWT).
- **Ranking**: Update the PostgreSQL `search_venues` function to incorporate `sponsor_tier` as the primary sort key before distance/relevance.
- **Analytics**: Create owner-scoped views for the `outbound_clicks` and `venue_views` data.

## Key References
- `prposal.md` — Section P4 (Revenue Loop).
- `NEXT_ACTIONS.md` — Phase 10 Kickoff.
