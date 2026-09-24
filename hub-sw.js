/* ⚡ FUJI-HAYA GAME ZONE — service worker for the landing page only.
   It never touches the games' own caches; each game keeps its own. */
'use strict';

const CACHE_VERSION = 'v20260924i';
const CACHE_NAME = 'fh-hub-' + CACHE_VERSION;

const PRECACHE = [
  './',
  './index.html',
  './hub.css?v=20260924i',
  './hub-manifest.json',
  './electric_troll/images/logo.png',
  './electric_troll/images/cover.jpg',
  './electric_troll/fonts/bangers-latin.woff2',
  './electric_troll/fonts/nunito-latin.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fh-hub-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Only the hub's own files are served from here — anything inside a game folder goes to the
   network (and that game's own worker), so the games stay in charge of their own offline copies. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL('./', self.location.href).pathname;
  const rest = url.pathname.startsWith(scope) ? url.pathname.slice(scope.length) : url.pathname;
  const mine = rest === '' || rest === 'index.html' || rest.startsWith('hub') ||
    rest.startsWith('electric_troll/images/') || rest.startsWith('electric_troll/fonts/');
  if (!mine) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
