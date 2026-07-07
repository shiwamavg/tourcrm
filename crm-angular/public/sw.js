const CACHE_NAME = 'tour-crm-portal-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-First for API requests (specifically portal details)
  if (url.pathname.includes('/api/portal/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clone);
            });
          }
          return res;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
    return;
  }

  // Cache-First for static assets and Angular build bundles
  e.respondWith(
    caches.match(e.request).then((cachedRes) => {
      if (cachedRes) {
        return cachedRes;
      }
      return fetch(e.request).then((res) => {
        // Cache newly fetched static assets
        if (
          res.status === 200 &&
          (url.origin === self.location.origin) &&
          !url.pathname.startsWith('/api/')
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return res;
      });
    })
  );
});
