# Phase 06: Polish & Launch - Research

**Researched:** 2024-05-22
**Domain:** Performance, Deployment, Analytics, UAT, Launch Strategy
**Confidence:** HIGH

## Summary

This research phase focuses on preparing KidSpot London for production. The stack is Next.js (frontend) and Node.js/Express (backend) running in a Docker Compose environment on an ARM VPS. The key objectives are optimizing performance, establishing a robust production process management, integrating privacy-first analytics, and defining the user acceptance and launch roadmap.

**Primary recommendation:** Use `Clinic.js` for backend performance triage, `next-plausible` for analytics integration, and a phased soft-launch starting with high-intent London community groups.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Performance Profiling (Next.js) | Browser / Client | Frontend Server (SSR) | Next.js spans both; profiling must cover hydration and server-render times. |
| Performance Profiling (Node.js) | API / Backend | — | Bottlenecks in PostGIS queries or LLM parsing occur purely on the backend. |
| Process Management (PM2) | Infrastructure | — | PM2 monitors and restarts processes at the OS/Container level. |
| Analytics (Plausible) | Browser / Client | — | Telemetry is collected via client-side script with optional SSR proxying. |
| UAT / Feedback | Browser / Client | External | Feedback is initiated by users on the frontend but stored/managed externally. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-plausible` | 3.12.0 | Plausible Analytics | Best-in-class wrapper for Next.js; handles script optimization and proxying. |
| `pm2` | 5.3.1 | Process Management | De-facto standard for Node.js production; supports cluster mode and auto-restart. |
| `clinic` | 13.0.0 | Perf Diagnostics | Comprehensive suite (Doctor, Flame, Bubbleprof) for Node.js performance. |
| `autocannon` | 7.15.0 | Load Testing | High-performance HTTP benchmarker; essential for saturating the app during profiling. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `next-measure` | — | Core Web Vitals | To track LCP, FID, and CLS during development. |
| `0x` | 5.5.0 | Flamegraphs | Specifically for pinpointing CPU hotspots in Node.js. |
| `tally.so` | — | UAT Feedback | Simple, no-code form for beta users to submit structured feedback. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pm2` | `docker restart` policy | PM2 offers cluster mode (multi-core) and better internal logging/monitoring. |
| `plausible` | `google analytics` | GA is more powerful but fails the project's "privacy-first / no PII" requirement. |
| `clinic` | `node --prof` | Built-in profiler is lighter but requires manual processing of logs (v8.log). |

**Installation:**
```bash
# Global tools for the server
npm install -g pm2 clinic autocannon

# Project dependencies
npm install next-plausible
```

**Version verification:** 
- `pm2`: 5.3.1 (Latest stable as of May 2024) [VERIFIED: npm registry]
- `next-plausible`: 3.12.0 [VERIFIED: npm registry]
- `clinic`: 13.0.0 [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```
.
├── backend/
│   ├── ecosystem.config.js  # PM2 config for API and Workers
│   └── ...
├── frontend/
│   ├── ecosystem.config.js  # PM2 config for Next.js
│   └── ...
└── docker-compose.yml       # Orchestrates PM2-managed containers
```

### Pattern 1: Multi-Core Cluster Mode
**What:** Running multiple instances of the application on a single VPS to leverage all CPU cores.
**When to use:** Production environments (not dev).
**Example:**
```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kidspot-api',
    script: './src/server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' }
  }]
};
```

### Anti-Patterns to Avoid
- **Running PM2 inside Docker without `pm2-runtime`:** Using `pm2 start` in Docker will cause the container to exit immediately. Always use `pm2-runtime`.
- **Global analytics in local dev:** Tracking `localhost` pollutes production metrics. Always disable Plausible in dev.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load Balancing | Custom cluster logic | `pm2 cluster` | PM2 handles the master/worker communication and zero-downtime reloads. |
| Feedback Forms | Custom React forms | `Tally.so` / `Google Forms` | UAT requires speed; don't spend dev cycles on "feedback submission" UI. |
| Flamegraphs | Manual dtrace/v8 log parsing | `0x` / `Clinic Flame` | Visualization of the stack is complex; these tools automate the mapping. |

## Common Pitfalls

### Pitfall 1: Hydration Mismatch in Next.js
**What goes wrong:** Next.js throws errors because the server-rendered HTML doesn't match the client-rendered DOM.
**Why it happens:** Using `window` or `localStorage` inside the initial render.
**How to avoid:** Use `useEffect` for client-only logic or `next/dynamic` with `ssr: false`.

### Pitfall 2: Zombie Processes in PM2
**What goes wrong:** A process dies but PM2 keeps trying to restart it, causing a loop that eats CPU.
**How to avoid:** Set `max_restarts` and `restart_delay` in `ecosystem.config.js`.

## Code Examples

### Plausible Integration (App Router)
```tsx
// frontend/src/app/layout.tsx
import PlausibleProvider from 'next-plausible'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider 
          domain="kidspot.london" 
          trackOutboundLinks={true}
          proxy={true} // Bypasses adblockers
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Performance Triage Workflow
```bash
# 1. Generate load
autocannon -c 50 -d 20 http://localhost:3000/api/search?q=SE1

# 2. Run Clinic Doctor to find the "area" of the problem
clinic doctor -- node backend/src/server.js

# 3. If I/O or Async is slow, use Bubbleprof
clinic bubbleprof -- node backend/src/server.js
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Universal Analytics | Plausible / PostHog | 2022+ | Privacy compliance; no cookie banners needed. |
| `nodemon` in prod | `pm2` / `kubernetes` | — | Resilience and multi-core scaling. |
| LightHouse only | Next.js Speed Insights | 2023 | RUM (Real User Monitoring) vs Lab data. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The project uses Next.js 13+ App Router. | Plausible | Code example for layout.tsx might need adjustment for Pages Router. |
| A2 | The VPS has multiple cores available. | PM2 | Cluster mode 'max' might be unnecessary for 1-core VPS. |

## Open Questions

1. **Self-hosted vs Cloud Plausible?**
   - Cloud is $9/mo but easy. Self-hosting requires another Docker container and maintenance.
   - Recommendation: Start with Cloud for 30-day trial to focus on launch, then migrate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | 22.2.2 | — |
| Docker Compose | Deployment | ✓ | 5.1.3 | — |
| PM2 | Process Mgmt | ✗ | — | `npm install -g pm2` |
| Autocannon | Perf Testing | ✗ | — | `npm install -g autocannon` |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Sanitize query params in search to prevent SQLi in PostGIS. |
| V14 Configuration | yes | Ensure `NODE_ENV=production` is set in PM2. |

## Sources

### Primary (HIGH confidence)
- [Context7 /vercel/next.js] - CLI flags for profiling
- [Context7 /unitech/pm2] - Ecosystem configuration
- [next-plausible official docs] - Integration patterns

### Secondary (MEDIUM confidence)
- [Node.js Performance Guide] - Triage workflow (Autocannon -> Clinic)
- [Plausible Proxying Guide] - Bypassing adblockers with Next.js rewrites

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified current versions.
- Architecture: HIGH - Industry standard PM2/Docker patterns.
- Pitfalls: MEDIUM - Based on common Node/Next production experience.

**Research date:** 2024-05-22
**Valid until:** 2024-12-30
