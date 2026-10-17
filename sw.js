// Offline cache for the installed (Add to Home Screen) game. Cache-first for same-origin GETs.
// index.html is revalidated in the background; bump VERSION to drop stale assets. Paths are relative to the
// SW scope, so this works under a GitHub Pages subpath (Vite base './').
const VERSION = 'anchor-v2';
const PXL = ['classes16', 'hero', 'npc_brine', 'npc_dex', 'npc_marlo', 'npc_ned', 'npc_pip', 'npc_sable', 'npc_wren', 'tiles', 'unit_n', 'water'];
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  ...['class_sprites', 'classes', 'hero', 'npcs', 'portraits', 'tiles', 'unit_n'].map((n) => `./assets/${n}.png`),
  ...PXL.flatMap((n) => [`./assets/pxl/${n}.png`, `./assets/pxl/${n}.json`]),
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      // Individually, so one missing optional asset doesn't fail the whole install.
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const nav = req.mode === 'navigate';
      const key = nav ? './' : req;
      const refresh = () =>
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') void cache.put(key, res.clone());
          return res;
        });
      const hit = await cache.match(key);
      if (!hit) return refresh();
      // The page is revalidated in the background so a new deploy (new hashed JS) shows up next launch.
      if (nav) refresh().catch(() => {});
      return hit;
    }),
  );
});
