// TMF Service Worker (fixed for GitHub Pages)

const CACHE = 'tmf-v1';

// Wichtig: relative Pfade (funktionieren immer auf GitHub Pages)
const ASSETS = [
  './',
  './index.html',
  './manifesto.json'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// ── FETCH (safe version) ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
