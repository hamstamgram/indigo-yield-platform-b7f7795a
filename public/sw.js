// Indigo Yield Platform PWA Service Worker v2.0
// Enhanced with performance optimizations and caching strategies

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// Cache strategies
const CACHE_STRATEGIES = {
  networkFirst: ['/api/', '/auth/'],
  cacheFirst: ['/icons/', '/images/', '/_next/static/'],
  staleWhileRevalidate: ['/_next/data/', '/data/'],
  networkOnly: ['/api/auth/', '/api/admin/'],
};

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => !name.includes(CACHE_VERSION))
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - apply caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Supabase auth
  if (request.method !== 'GET' || /supabase\.(co|in)/.test(url.host)) return;

  // Determine strategy
  let strategy = 'staleWhileRevalidate';
  for (const [strat, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => url.pathname.startsWith(pattern))) {
      strategy = strat;
      break;
    }
  }

  // Apply strategy
  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    case 'networkOnly':
      event.respondWith(fetch(request));
      break;
  }
});

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    caches.open(DYNAMIC_CACHE).then(cache => {
      cache.put(request, response.clone());
    });
    return response;
  });

  return cached || fetchPromise;
}
