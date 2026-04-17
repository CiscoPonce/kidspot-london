# Codebase Structure

**Analysis Date:** 2025-04-15

## Directory Layout

```
[project-root]/
├── backend/            # Express API and Data Scripts
│   ├── data/           # CSV data sources (London Datastore)
│   ├── db/             # SQL Schema, migrations and procedures
│   ├── scripts/        # Data ingestion and discovery scripts
│   │   └── discovery/  # External API discovery scripts
│   ├── src/            # Backend API source code
│   │   ├── middleware/ # Express middleware
│   │   ├── routes/     # API route handlers
│   │   └── services/   # Business logic (currently empty/implicit in routes)
│   ├── Dockerfile      # API server containerization
│   └── Dockerfile.worker # Background worker containerization
├── frontend/           # Next.js Application
│   ├── src/
│   │   ├── app/        # App Router pages and layouts
│   │   ├── components/ # UI components (map, search, venues, etc.)
│   │   ├── hooks/      # Custom React hooks (useSearch, useLocation)
│   │   ├── lib/        # Shared logic and API client
│   │   └── providers/  # Context providers (React Query)
│   ├── public/         # Static assets
│   ├── tailwind.config.js # Styling configuration
│   └── tsconfig.json   # TypeScript configuration
└── docker-compose.yml  # Orchestration for local development/deployment
```

## Directory Purposes

**backend/scripts:**
- Purpose: Standalone Node.js scripts for non-request-driven operations.
- Contains: Ingestion scripts (`import-london-datastore.js`), Discovery logic (`discovery/run-discovery.js`), Maintenance (`cron-agent.js`), and test scripts.
- Key files: `scripts/discovery/run-discovery.js`.

**backend/db:**
- Purpose: Source of truth for database schema and server-side logic.
- Contains: SQL files.
- Key files: `db/schema.sql` (contains all core SQL functions).

**frontend/src/components:**
- Purpose: Modular UI components.
- Contains: Map-related components (`map/`), search controls (`search/`), list views (`venues/`).
- Key files: `components/map/venue-map.tsx`.

**frontend/src/hooks:**
- Purpose: Reusable UI logic.
- Contains: Geo-location logic, search state sync.
- Key files: `hooks/use-search.tsx`.

## Key File Locations

**Entry Points:**
- `backend/src/server.js`: API entry point.
- `frontend/src/app/page.tsx`: Frontend main page.
- `backend/scripts/discovery/run-discovery.js`: Manual discovery entry point.

**Configuration:**
- `backend/.env.example`: Backend environment template.
- `frontend/next.config.js`: Next.js config.
- `docker-compose.yml`: Infrastructure configuration.

**Core Logic:**
- `backend/db/schema.sql`: Geospatial and ranking logic (SQL).
- `backend/src/routes/search.js`: Search and fallback coordination.
- `frontend/src/lib/api.ts`: Frontend API client.

**Testing:**
- `backend/scripts/test-*.js`: Ad-hoc test scripts for backend features.
- Jest tests expected in `backend/` (noted in `package.json` but not explicitly located in exploration).

## Naming Conventions

**Files:**
- Backend: `kebab-case.js` (e.g., `search-venues.js`).
- Frontend Components: `kebab-case.tsx` (e.g., `venue-card.tsx`).
- Frontend Hooks: `use-*.ts` (e.g., `use-location.ts`).

**Directories:**
- Mostly `kebab-case` or pluralized names (e.g., `components`, `routes`, `services`).

## Where to Add New Code

**New Feature:**
- API logic: Add to `backend/src/routes/` or `backend/src/services/`.
- UI: Add new page in `frontend/src/app/` or component in `frontend/src/components/`.

**New Component/Module:**
- Implementation: `frontend/src/components/[category]/[name].tsx`.

**Utilities:**
- Backend: `backend/src/services/` or a new `backend/src/utils/` directory.
- Frontend: `frontend/src/lib/`.

**New Data Source:**
- Add discovery script in `backend/scripts/discovery/`.
- Add mapping logic in `backend/scripts/cron-agent.js`.

## Special Directories

**.planning/:**
- Purpose: Strategic documentation and codebase mapping.
- Committed: Yes.

**backend/data/:**
- Purpose: Contains CSV data for initial seeding.
- Committed: Yes.

---

*Structure analysis: 2025-04-15*
