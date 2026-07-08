// KidSpot London — Service Worker
// Manual service worker with versioned caching (no Workbox, no next-pwa)
// Cache strategies: network-first for search, stale-while-revalidate for venue detail

const CACHE = 'kidspot-v1';
const SEARCH_CACHE = 'kidspot-search-v1';
const DETAIL_CACHE = 'kidspot-detail-v1';
const STATIC_CACHE = 'kidspot-static-v1';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ─── Install: pre-cache app shell ───────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate: delete old caches, claim clients ─────────────────────────────

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE, SEARCH_CACHE, DETAIL_CACHE, STATIC_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// ─── Helper: network-first with cache fallback ───────────────────────────────

async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeoutMs),
  );

  try {
    const response = await Promise.race([fetch(request), timeout]);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('response not ok');
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: return app shell for navigation requests
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Helper: stale-while-revalidate ─────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ─── Helper: cache-first with network fallback ──────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ─── Fetch: route requests to appropriate strategy ──────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip browser extensions and dev tools
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // Search API: network-first
  if (url.pathname.startsWith('/api/search/venues')) {
    event.respondWith(networkFirst(event.request, SEARCH_CACHE));
    return;
  }

  // Venue detail pages: stale-while-revalidate
  if (url.pathname.match(/^\/venue\//)) {
    event.respondWith(staleWhileRevalidate(event.request, DETAIL_CACHE));
    return;
  }

  // Other API calls: network-first with shorter timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, CACHE, 3000));
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?|ico)$/)
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Navigation requests: network-first with app shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, CACHE));
    return;
  }
});

// ─── Message: listen for skip-waiting (update prompt) ───────────────────────

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});
