# Phase 08: Revenue & Framework Modernization - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the revenue loop with Stripe integration and modernize the framework stack to current stable versions:
- Implement claim your listing flow with Stripe sponsorship tiers
- Add admin audit log for fraud prevention
- Upgrade to Node 22, Express 5, Next 16, React 19, Tailwind 4
- Establish CI pipeline with lint, typecheck, and tests
- Add analytics events and observability metrics
- Polish product surface with Server Components and map clustering
</domain>

<decisions>
## Implementation Decisions

### Framework Upgrade Strategy
- **D-01**: Use sequential phased approach - each upgrade ships behind its own feature branch with CI gate. This minimizes blast radius and makes rollbacks easier to debug.
- **D-02**: Follow proposal order for upgrades: Node 22 → Express 5 → Frontend coordinated (Next 16 + React 19 + Tailwind 4 + MapLibre 5). This isolates breaking changes and follows a proven path.
- **D-03**: Full coverage testing before each upgrade - aim for 80%+ coverage on services and routes, add E2E tests with Playwright for user flows. This is thorough but time-intensive.
- **D-04**: Fix-forward only for rollbacks - if an upgrade causes issues, we'll fix it forward rather than reverting. This is the fastest approach but highest risk.

### the agent's Discretion
- Specific test coverage targets for each upgrade phase
- E2E test scenarios to prioritize with Playwright
- Performance benchmarks to validate after each upgrade
- Breaking change mitigation strategies for each library

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proposal Document
- `prposal.md` — Comprehensive improvement plan with detailed upgrade recommendations and execution timeline

### Prior Phase Context
- `.planning/phases/07-improvement/07-VERIFICATION.md` — Phase 7 completion status and deferred requirements
- `.planning/phases/07-improvement/07-RESEARCH.md` — Technical research from Phase 7

### Tech Stack References
- `backend/package.json` — Current backend dependencies (Express 4.18.2, Node 20)
- `frontend/package.json` — Current frontend dependencies (Next 14.2.5, React 18.3.1, Tailwind 3.4.7)
- `backend/src/server.ts` — Current Express server setup
- `frontend/src/app/layout.tsx` — Current Next.js metadata pattern

### Upgrade Documentation
- Next.js 16 upgrade guide — https://nextjs.org/docs/app/building-your-application/upgrading
- Express 5 migration guide — https://expressjs.com/en/guide/migrating-5.html
- Tailwind 4 upgrade guide — https://tailwindcss.com/docs/upgrade-guide
- Google Places API v1 migration — https://developers.google.com/maps/documentation/places/web-service/upgrade

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Layered backend architecture (Controllers/Services/Clients) from Phase 7
- TypeScript migration completed in Phase 7
- Vitest testing infrastructure with 14 passing tests
- Pino logging with structured JSON output
- Redis rate limiting and caching
- HMAC timing-safe authentication for admin endpoints

### Established Patterns
- Express 4 middleware pattern (will need adaptation for Express 5)
- Next.js 14 App Router patterns (will need adaptation for Next 16)
- Tailwind 3 utility-first CSS (will need adaptation for Tailwind 4)
- BullMQ workers for background jobs
- GitHub Actions workflows for CI/CD

### Integration Points
- Backend: Express server in `backend/src/server.ts`
- Frontend: Next.js app in `frontend/src/app/`
- Database: PostgreSQL 15 + PostGIS in `backend/db/schema.sql`
- Cache/Queue: Redis in `backend/src/clients/redis.ts`
- External APIs: Google Places, Brave Search, OpenRouter

### Known Breaking Changes
- Express 5: async error handling improved, req.query parsing stricter
- Next 16: App Router changes, Server Actions, Partial Prerendering stable
- React 19: transitions, Actions available
- Tailwind 4: new engine, CSS-first config
- Google Places v1: new endpoints, FieldMask header, different response shape

</code_context>

<specifics>
## Specific Ideas

### Upgrade Order (from proposal)
1. Bump Node engine (22 LTS) and all non-breaking minor versions first
2. Express 4 → 5 on the backend (independent from frontend)
3. Frontend: Next 14 → 15 → 16, React 18 → 19, Tailwind 3 → 4, MapLibre 4 → 5 in one coordinated branch
4. Google Places Legacy → v1 last (isolated blast radius)

### Testing Strategy
- Aim for 80%+ coverage on services and routes
- Add E2E tests with Playwright for critical user flows
- Test breaking changes with integration tests
- Manual smoke test after each upgrade

### Performance Targets
- Load time: < 2 seconds on mobile
- Search latency: < 500ms for cached results
- Cache hit rate: > 70% for common searches

</specifics>

<deferred>
## Deferred Ideas

### Revenue Flow UX
- Claim form fields and validation
- Email verification process
- Admin approval workflow
- Stripe pricing tiers and benefits

### Sponsorship Display
- Visual indicators on venue pages
- Ranking boost behavior
- Featured placement on landing pages

### Analytics Events
- Revenue funnel events to track
- Performance metrics to expose
- Privacy considerations

### Map Clustering
- Clustering algorithm choice
- Cluster interaction behavior
- Performance considerations

</deferred>

---

*Phase: 08-revenue-framework*
*Context gathered: 2026-04-21*
