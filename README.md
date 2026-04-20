# KidSpot London 🇬🇧

**KidSpot London** is a hyper-local search engine designed to solve the data fragmentation problem for parents looking for child-friendly venues in London. By combining public datasets, intelligent agentic discovery, and real-time web search fallbacks, KidSpot provides an instant, geo-aware directory of safe, age-appropriate locations for parties, play, and gatherings.

---

## 🚀 Key Features

- **Hyper-Local Search**: Search by postcode or current location with a customizable radius (1-10 miles).
- **Agentic Discovery**: Real-time integration with Brave Search API to ensure "zero-result" searches never happen. If it's on the web, KidSpot will find it.
- **On-Demand Venue Details**: Minimizes data decay by fetching the latest venue info (opening hours, ratings, photos) directly from Google Places and OpenStreetMap on-demand.
- **Programmatic SEO**: 33+ dedicated area pages (e.g., "Venues in Islington") and category-specific landing pages (e.g., "Soft Play in London").
- **Sponsor System**: Multi-tiered monetization engine (Gold, Silver, Bronze) for featured local business listings.
- **Mobile First**: Fast, responsive UI optimized for busy parents on the go.

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Maps**: MapLibre GL JS
- **State Management**: React Query
- **Analytics**: Plausible (Privacy-first)

### Backend
- **Runtime**: Node.js 20 (Express)
- **Database**: PostgreSQL 15 + PostGIS (Spatial queries)
- **Caching**: Redis
- **Task Queue**: BullMQ (for background discovery)
- **Process Manager**: PM2

---

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- API Keys for:
  - **Brave Search API** (Required for fallback search)
  - **Google Places API** (Required for rich venue details)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/kidspot-london.git
   cd kidspot-london
   ```

2. **Configure Environment Variables**:
   Copy the example env files and fill in your API keys:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your BRAVE_API_KEY and GOOGLE_PLACES_API_KEY
   ```

3. **Launch with Docker**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   - **Frontend**: `http://localhost:3000`
   - **API**: `http://localhost:4000/api/search/venues`

---

## 🔍 Local Verification (London)

KidSpot is optimized for London geography. To test the agentic search logic locally:
1. Ensure your **Brave Search API Key** is active in `.env`.
2. Search for a specific London postcode (e.g., `N1 9GU`).
3. If no local records exist, the **London-aware Agent** will trigger, automatically appending "London UK" to your query to find the best local pubs, parks, and halls.

---

## 🛡️ Security & Performance

- **Production Ready**: Uses PM2 Cluster Mode to fully utilize multi-core architectures.
- **Rate Limited**: API protection via `express-rate-limit` (60 req/min).
- **Secure Headers**: Implemented `helmet.js` for robust HTTP security.
- **Optimized Caching**: 1-hour Redis cache for all venue details and search results.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
