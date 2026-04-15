# KidSpot London

A zero-friction utility for parents in the UK to discover, evaluate, and share child-friendly spaces, starting with London.

## Overview

KidSpot London helps parents find:
- Soft play centres
- Community halls
- Parks and playgrounds
- Other child-friendly venues

**Key Features:**
- **Lean Database:** Store only essential venue data (name, location, type)
- **Agentic Search:** Fetch full venue details on-demand from multiple sources
- **Sponsor System:** Monetization through sponsored result placement
- **Continuous Discovery:** Cron agent discovers and categorizes new venues
- **Spatial Queries:** Fast location-based search with PostGIS
- **Mobile-First:** Responsive design optimized for parents on the go

## Architecture

### Lean Database + Agentic Search

**What we store locally:**
- Venue name
- Location (lat/lon)
- Type (softplay, community_hall, park, other)
- Source (Google, OSM, etc.)
- Sponsor tier (bronze, silver, gold)

**What we fetch on-demand:**
- Address and postcode
- Phone number
- Website
- Reviews and ratings
- Photos
- Opening hours

**Benefits:**
- Fast spatial queries (minimal data)
- Always fresh data (fetched from sources)
- Low storage costs
- Scalable to millions of venues
- Monetization-ready

## Tech Stack

- **Frontend:** Next.js (React 18), TailwindCSS, MapLibre GL JS
- **Backend:** Node.js 20, Express
- **Database:** PostgreSQL 15 + PostGIS (spatial queries)
- **Cache:** Redis (caching and queues)
- **Discovery:** Google Places API, OpenStreetMap (Overpass API)
- **Infrastructure:** Docker Compose on ARM VPS

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- ARM-based VPS (recommended: DigitalOcean, AWS, Hetzner)
- Git
- Google Places API Key (for venue discovery)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kidspot
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

- `DB_PASSWORD` - PostgreSQL database password (32+ chars, mixed case, numbers, symbols)
- `GOOGLE_PLACES_API_KEY` - Google Places API key for venue discovery
- `ADMIN_KEY` - Admin key for sponsor management (generate secure random string)

### 3. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (PostGIS 15) on port 5432 (internal only)
- Redis 7 on port 6379 (internal only)
- API server on port 4000

### 4. Initialize Database

```bash
docker-compose exec postgres psql -U kidspot_admin -d kidspot -f /docker-entrypoint-initdb.d/init.sql
```

### 5. Discover Venues

```bash
# Run all discovery sources
docker-compose exec backend npm run discover

# Or run specific sources
docker-compose exec backend npm run discover:google
docker-compose exec backend npm run discover:osm
```

### 6. Verify Setup

Check that all services are running:

```bash
docker-compose ps
```

Test the API health endpoint:

```bash
curl http://localhost:4000/health
```

## API Endpoints

### Search

**Search venues by location:**
```bash
GET /api/search/venues?lat=51.5074&lon=-0.1278&radius_miles=5&type=softplay&limit=50
```

**Get venue details (agentic search):**
```bash
GET /api/search/venues/:id/details
```

### Sponsors

**Get sponsor statistics:**
```bash
GET /api/sponsors/stats
```

**Get sponsored venues:**
```bash
GET /api/sponsors/venues?tier=gold
```

**Get sponsor pricing:**
```bash
GET /api/sponsors/pricing
```

**Update sponsor tier (admin only):**
```bash
PUT /api/sponsors/venues/:id/tier
Headers: X-Admin-Key: ${ADMIN_KEY}
Body: { "tier": "gold", "priority": 100 }
```

## Scripts

### Discovery Scripts

```bash
# Run all discovery sources
npm run discover

# Run specific sources
npm run discover:google
npm run discover:osm
```

### Cron Agent

```bash
# Run cron agent (updates stale venues)
npm run cron
```

### Import Scripts

```bash
# Download London Datastore CSVs
npm run download

# Import CSV data
npm run import

# Verify import
npm run verify
```

## Sponsor System

### Sponsor Tiers

**Bronze (£99/month):**
- Appear in top 10 results
- Subtle badge
- Basic analytics

**Silver (£199/month):**
- Appear in top 5 results
- Prominent badge
- Advanced analytics
- Priority support

**Gold (£499/month):**
- Appear in top 3 results
- Featured styling
- Premium analytics
- Dedicated support
- Custom branding

### Sponsor Ranking

Results are ordered by:
1. Sponsor tier (gold > silver > bronze > none)
2. Sponsor priority (within same tier)
3. Distance (within same tier and priority)

## Docker Compose Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

### Rebuild Services

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build api
```

## Development

### Local Development Setup

For local development without Docker:

```bash
# Install dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env

# Start PostgreSQL (using Docker)
docker run -d \
  --name kidspot-postgres \
  -e POSTGRES_USER=kidspot_admin \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=kidspot \
  -p 5432:5432 \
  postgis/postgis:15-3.3-arm64

# Start Redis (using Docker)
docker run -d \
  --name kidspot-redis \
  -p 6379:6379 \
  redis:7-alpine

# Initialize database
psql -U kidspot_admin -d kidspot -f db/init.sql

# Start API server
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run typecheck
```

## Project Structure

```
kidspot/
├── backend/                 # Backend API and services
│   ├── src/
│   │   ├── server.js       # Express API server
│   │   ├── routes/         # API routes
│   │   │   ├── search.js   # Search endpoints
│   │   │   └── sponsors.js # Sponsor management
│   │   └── services/       # Business logic
│   ├── scripts/            # Utility scripts
│   │   ├── discovery/      # Discovery scripts
│   │   │   ├── google-places-discovery.js
│   │   │   ├── osm-discovery.js
│   │   │   └── run-discovery.js
│   │   ├── download-datastore.js
│   │   ├── import-london-datastore.js
│   │   ├── verify-import.js
│   │   └── cron-agent.js   # Continuous scraping
│   ├── db/                 # Database schema and migrations
│   │   ├── init.sql
│   │   ├── schema.sql
│   │   ├── test_spatial.sql
│   │   └── migrations/
│   ├── data/               # Data files
│   │   └── test-sample.csv
│   ├── Dockerfile          # API service container
│   ├── Dockerfile.worker   # Worker service container
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utility functions
├── docker-compose.yml     # Docker orchestration
├── .env.example          # Environment variables template
├── README.md             # This file
└── technical_overview.md  # Detailed technical documentation
```

## Security Considerations

### Production Deployment

1. **Database Security**
   - PostgreSQL port is NOT exposed externally (internal Docker network only)
   - Use strong passwords (32+ chars, mixed case, numbers, symbols)
   - Enable SSL in production

2. **API Security**
   - Implement rate limiting (60 req/min per IP)
   - Use Helmet.js for security headers
   - Enable CORS only for trusted domains
   - Validate all input parameters
   - Protect admin endpoints with API keys

3. **Container Security**
   - Run containers as non-root users
   - Use official Docker images with specific tags
   - Keep images updated with security patches
   - Scan images for vulnerabilities

4. **Secrets Management**
   - Never commit `.env` files
   - Use environment variables for all secrets
   - Rotate API keys regularly
   - Use secret management services in production

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check service status
docker-compose ps

# Restart specific service
docker-compose restart <service-name>
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose exec postgres pg_isready -U kidspot_admin

# Check database exists
docker-compose exec postgres psql -U kidspot_admin -l

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose exec redis redis-cli ping

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

## Performance Optimization

### Database

- Spatial indexes (GIST) for fast geo-queries
- Type indexes for quick filtering
- Sponsor indexes for monetization
- Connection pooling for high concurrency

### Caching

- Redis for search results (1 hour TTL)
- Geocoding results cached indefinitely
- Venue details cached for 1 hour

### API

- Rate limiting to prevent abuse
- Response compression
- CDN for static assets

## Monitoring

### Health Checks

All services include health checks:

```bash
# API health
curl http://localhost:4000/health

# PostgreSQL health
docker-compose exec postgres pg_isready -U kidspot_admin

# Redis health
docker-compose exec redis redis-cli ping
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[License information here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]

## Roadmap

- [x] Phase 1: Data Foundation (Weeks 1-2) - Lean database + discovery
- [ ] Phase 2: Ingestion Engine (Weeks 3-4) - Cron agent + categorization
- [ ] Phase 3: Backend API & Fallback (Weeks 5-6) - Agentic search + sponsor system
- [ ] Phase 4: Frontend Core (Weeks 7-8) - Mobile-first UI + map integration
- [ ] Phase 5: SEO & Detail Pages (Weeks 9-10) - Programmatic SEO
- [ ] Phase 6: Polish & Launch (Weeks 11-12) - Performance + deployment
