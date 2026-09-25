/* Retired: this game used to keep its own offline worker. The whole site now shares one worker
   (../sw.js) that saves every game at once. A device that still has this old one: it clears its
   own cache and bows out, so the site-wide worker takes over on the next load. */
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('electrical-troll-')) await caches.delete(k);
    await self.registration.unregister();
  })());
});
self.addEventListener('fetch', () => {});   // no answer: requests go to the network as normal
