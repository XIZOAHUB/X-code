/*
  XIZOAHUB CODE – PWA PRO SERVICE WORKER
  Handles caching, version updates, and offline fallback.
*/

const CACHE_NAME = 'xizoa-cache-v3';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/storage.js',
  './manifest.json',
  './assets/favicon.png'
];

// 🌀 Install – cache everything important
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
  console.log('[XIZOAHUB] Installed & Cached');
});

// ⚙️ Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[XIZOAHUB] Removing old cache:', key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// ⚡ Fetch – serve from cache first, then network
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only cache GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, networkResponse.clone())
            );
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for HTML requests
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });

      // Return cached or network response
      return cachedResponse || networkFetch;
    })
  );
});

// 🧠 Message handler – for update prompts
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
