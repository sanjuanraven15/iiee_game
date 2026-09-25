/* ⚡ ELECTRICAL TROLL — service worker: caches the whole game so it runs fully offline.
   Bump CACHE_VERSION whenever any file changes (keep it in sync with the ?v= tags in index.html). */
'use strict';

const CACHE_VERSION = 'v20260925c';
const CACHE_NAME = 'electrical-troll-' + CACHE_VERSION;
const V = '?v=20260925c';

/* App shell — everything the game needs. Query strings must match index.html exactly. */
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css' + V,
  './js/storage.js' + V,
  './js/audio.js' + V,
  './js/levels.js' + V,
  './js/traps.js' + V,
  './js/mascot.js' + V,
  './js/game.js' + V,
  './js/fx.js' + V,
  './js/ui.js' + V,
  './fonts/bangers-latin.woff2',
  './fonts/nunito-latin.woff2',
  './images/logo.png',
  './images/cover.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('electrical-troll-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first for anything we know; otherwise network, and remember it for next time.
   Navigations fall back to the cached index.html so the game opens with no connection at all. */
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
