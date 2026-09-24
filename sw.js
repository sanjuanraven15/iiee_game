/* Tombstone for the service worker that used to live here, before the games moved into
   electric_troll/ and zip/. Browsers that still hold the old registration fetch this file on
   their next update check: it wipes the old caches and unregisters itself, so nobody keeps
   getting served stale copies of the games. Each game now registers its own worker. */
'use strict';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (/^electrical-troll-|^zip-circuit-/.test(key)) await caches.delete(key);
    await self.clients.claim();
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url).catch(() => {});
  })());
});

/* while this worker is still alive, never answer from a cache */
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)); });
