# Technology Stack

**Analysis Date:** 2025-04-15

## Languages

**Primary:**
- JavaScript (ES2022+) - Backend logic, ingestion scripts, and API.
- TypeScript 5.5 - Frontend development and type safety.

**Secondary:**
- SQL (PostgreSQL/PLpgSQL) - Stored procedures for geospatial logic, deduplication, and ranking.
- CSS (Tailwind) - Frontend styling.

## Runtime

**Environment:**
- Node.js 20.0.0+ (specified in `backend/package.json`)
- Docker 20.10+ (specified via `docker-compose.yml`)

**Package Manager:**
- npm 10+
- Lockfile: `package-lock.json` present in both `backend/` and `frontend/`

## Frameworks

**Core:**
- Express 4.18 - Backend API framework.
- Next.js 14.2 (App Router) - Frontend framework.
- React 18.3 - UI library.

**Testing:**
- Jest 29.7 - Backend testing framework.
- Not detected - Frontend testing framework.

**Build/Dev:**
- Nodemon - Backend development auto-reload.
- Tailwind CSS 3.4 - Utility-first CSS framework.
- PostCSS 8.4 - CSS transformation.

## Key Dependencies

**Critical:**
- `pg` 8.11 - PostgreSQL client for Node.js.
- `maplibre-gl` 4.5 - Open-source map rendering for the frontend.
- `@tanstack/react-query` 5.51 - Data fetching and state management.
- `axios` 1.6 - HTTP client for external API requests.
- `bullmq` 5.1 - Task queue for background jobs (used by `worker` service).

**Infrastructure:**
- `ioredis` 5.3 - Redis client for caching and task queuing.
- `helmet` 7.1 - Security middleware for Express.
- `express-rate-limit` 7.1 - API rate limiting.
- `dotenv` 16.3 - Environment variable management.

## Configuration

**Environment:**
- Configured via `.env` files (see `backend/.env.example`).
- Key configs: `DATABASE_URL`, `REDIS_URL`, `GOOGLE_PLACES_API_KEY`, `BRAVE_API_KEY`, `NEXT_PUBLIC_API_URL`.

**Build:**
- `backend/Dockerfile` - Backend containerization.
- `backend/Dockerfile.worker` - Background worker containerization.
- `frontend/next.config.js` - Next.js configuration (standalone output).
- `frontend/tsconfig.json` - TypeScript configuration with `@/*` path alias.

## Platform Requirements

**Development:**
- Docker and Docker Compose.
- Node.js 20+.
- PostgreSQL 15+ with PostGIS 3.3+.
- Redis 7+.

**Production:**
- Deployment target: Containerized (Docker).
- Infrastructure: Managed PostgreSQL (PostGIS) and Redis.

---

*Stack analysis: 2025-04-15*
