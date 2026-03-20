// =========================================================
//  TERAHEADBMS — Service Worker  v3
//  Caches the app shell for offline use.
//  Cache-first for app shell; network-first for API calls.
// =========================================================

const CACHE_NAME    = 'thbms-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── Install ───────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => {
        console.log('[SW] Cached app shell');
        return self.skipWaiting(); // activate immediately
      })
  );
});

// ── Activate ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      console.log('[SW] Claiming clients...');
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that SW is active
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
    })
  );
});

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls or SSE — always go to network
  if (url.pathname.startsWith('/api/')) {
    return; // let browser handle natively
  }

  // For everything else: cache-first, fallback to network, then update cache
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Serve from cache; refresh in background
        const networkFetch = fetch(request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              const toCache = response.clone();
              caches.open(CACHE_NAME).then(c => c.put(request, toCache));
            }
            return response;
          })
          .catch(() => {/* offline — cached version will be used */});
        return cached;
      }
      // Not in cache — fetch from network and cache
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, toCache));
        return response;
      }).catch(() => {
        // Offline and not cached — return app shell for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── Skip waiting message (from app) ──────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting — applying update');
    self.skipWaiting();
  }
});
