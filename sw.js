/* SBS Interactive Mathematics — Service Worker
 * Strategy: "smart caching"
 *  - Core shell (home, chapters, labs, about pages + logo/icons) is precached on install.
 *  - HTML pages: network-first, falling back to cache when offline.
 *  - Everything else (CSS, JS, images): stale-while-revalidate — served from cache
 *    instantly, refreshed in the background. Anything a student has opened once
 *    keeps working offline.
 */

const VERSION = 'v1';
const CACHE_NAME = `sbs-math-${VERSION}`;
const BASE = '/SBS-Math-IGCSE-0580';

const CORE = [
  `${BASE}/index.html`,
  `${BASE}/chapters.html`,
  `${BASE}/labs.html`,
  `${BASE}/about.html`,
  `${BASE}/statistics.html`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/assets/logo.png`,
  `${BASE}/assets/logo-full.png`,
  `${BASE}/assets/icons/icon-192.png`,
  `${BASE}/assets/icons/icon-512.png`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Precache core; don't fail install if one file is missing
      Promise.allSettled(CORE.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave CDN/external requests alone

  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-first for pages: students always get the newest content when online
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match(`${BASE}/index.html`)
          )
        )
    );
    return;
  }

  // Stale-while-revalidate for assets
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
