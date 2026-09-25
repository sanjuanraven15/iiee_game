/* 🔌 ZIP — service worker: caches the puzzle so it runs fully offline.
   Bump CACHE_VERSION whenever any file changes (keep it in sync with the ?v= tags in index.html). */
'use strict';

const CACHE_VERSION = 'v20260925b';
const CACHE_NAME = 'zip-circuit-' + CACHE_VERSION;
const V = '?v=20260925b';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css' + V,
  './zip.css' + V,
  './js/mascot.js' + V,
  './zip.js' + V,
  './fonts/bangers-latin.woff2',
  './fonts/nunito-latin.woff2',
  './images/logo.png',
  './images/cover.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('zip-circuit-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first for anything we know; otherwise network, and remember it for next time. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        /* a versioned file requested with a different ?v= — serve whatever copy we have */
        return caches.match(req, { ignoreSearch: true });
      });
    })
  );
});
