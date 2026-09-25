/* ⚡ FUJI-HAYA GAME ZONE — one service worker for the whole site (hub + all three games).
   The first visit to ANY page saves every game, so all of them open with no connection afterwards.

   How requests are answered:
   • pages (navigations): network first (so a new deploy shows on the next load), cached copy when offline
     or when the network takes longer than a few seconds;
   • versioned files (?v=…): exact cached copy, else network, else the saved copy of that file (offline);
   • everything else (images, fonts): cached copy at once, refreshed in the background.

   Bump CACHE_VERSION on a deploy to re-download everything in one go (not required for updates to show). */
'use strict';

const CACHE_VERSION = '2026-09-25a';
const CACHE = 'fh-gamezone-' + CACHE_VERSION;
const OLD_CACHES = /^(fh-gamezone-|fh-hub-|electrical-troll-|zip-circuit-)/;
const NAV_TIMEOUT_MS = 4000;

const FILES = [
  /* hub */
  './', 'index.html', 'hub.css', 'hub-manifest.json',
  /* Electrical Troll */
  'electric_troll/', 'electric_troll/index.html', 'electric_troll/manifest.json', 'electric_troll/css/style.css',
  'electric_troll/js/storage.js', 'electric_troll/js/audio.js', 'electric_troll/js/levels.js', 'electric_troll/js/traps.js',
  'electric_troll/js/mascot.js', 'electric_troll/js/game.js', 'electric_troll/js/fx.js', 'electric_troll/js/ui.js',
  'electric_troll/fonts/bangers-latin.woff2', 'electric_troll/fonts/nunito-latin.woff2',
  'electric_troll/images/logo.png', 'electric_troll/images/cover.jpg',
  /* Zip */
  'zip/', 'zip/index.html', 'zip/manifest.json', 'zip/css/style.css', 'zip/zip.css', 'zip/js/mascot.js', 'zip/zip.js',
  'zip/fonts/bangers-latin.woff2', 'zip/fonts/nunito-latin.woff2', 'zip/images/logo.png', 'zip/images/cover.jpg',
  /* Light It Up! */
  'light_it_up/', 'light_it_up/index.html', 'light_it_up/style.css', 'light_it_up/game.js', 'light_it_up/fhe_logo.png',
  'light_it_up/fonts/bangers-latin.woff2', 'light_it_up/fonts/nunito-latin.woff2',
  'light_it_up/images/logo.png', 'light_it_up/images/cover.jpg'
];

const base = new URL('./', self.location.href);
/* cache key: same file whatever ?v= it was asked with; a folder means its index.html */
function keyOf(url) {
  const u = new URL(url, base);
  u.search = ''; u.hash = '';
  if (u.pathname.endsWith('/')) u.pathname += 'index.html';
  return u.href;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* one missing file must not stop the rest from being saved */
    await Promise.allSettled(FILES.map(async f => {
      const res = await fetch(new Request(new URL(f, base), { cache: 'reload' }));
      if (res.ok) await cache.put(keyOf(res.url || new URL(f, base)), res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (OLD_CACHES.test(k) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function save(req, res, alsoExact) {
  if (!res || !res.ok || res.type === 'opaque') return;
  const cache = await caches.open(CACHE);
  await cache.put(keyOf(req.url), res.clone());
  if (alsoExact) await cache.put(req.url, res.clone());
}

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  return (await cache.match(req.url)) || (await cache.match(keyOf(req.url)));
}

async function page(req) {
  const net = fetch(req).then(res => { save(req, res.clone()); return res; });
  net.catch(() => {});                                      // handled below; keeps a late failure quiet
  const timeout = new Promise(resolve => setTimeout(resolve, NAV_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([net, timeout]);
    if (res) return res;
    return (await fromCache(req)) || (await net);          // slow network: saved copy if there is one
  } catch (e) {
    return (await fromCache(req)) || (await caches.match(keyOf(new URL('index.html', base)))) || Response.error();
  }
}

async function versioned(req) {
  const cache = await caches.open(CACHE);
  const exact = await cache.match(req.url);
  if (exact) return exact;
  try {
    const res = await fetch(req);
    await save(req, res, true);
    return res;
  } catch (e) {
    return (await cache.match(keyOf(req.url))) || Response.error();   // offline: the saved copy of that file
  }
}

async function asset(req) {
  const hit = await fromCache(req);
  const refresh = fetch(req).then(res => { save(req, res.clone()); return res; });
  if (hit) { refresh.catch(() => {}); return hit; }
  try { return await refresh; } catch (e) { return Response.error(); }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(base.href)) return;
  if (req.headers.has('range')) return;                     // audio/video seeking: leave to the network
  if (req.mode === 'navigate') event.respondWith(page(req));
  else if (url.search) event.respondWith(versioned(req));
  else event.respondWith(asset(req));
});
