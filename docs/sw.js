// Fa funzionare l'app anche con poca rete: guscio dell'app in cache, dati aggiornati quando possibile.
const VERSION = 'cinema-v8';
const SHELL = ['./', 'index.html', 'app.css?v=2', 'app.js?v=4', 'config.js?v=2', 'manifest.webmanifest', 'icons/apple-touch-icon.png?v=2', 'icons/icon-192.png?v=2', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'cinema-img' && k !== 'cinema-data').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Locandine TMDB: prima la cache
  if (url.hostname === 'image.tmdb.org') {
    e.respondWith(caches.open('cinema-img').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Dati dal servizio Cloudflare: prima la rete, se manca la cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open('cinema-data').then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.open('cinema-data').then((c) => c.match(req)).then((r) => r || Response.error())));
    return;
  }
  // File dell'app: prima la rete (così gli aggiornamenti arrivano subito), senza rete la cache
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(async () => {
      const c = await caches.open(VERSION);
      return (await c.match(req, { ignoreSearch: req.mode === 'navigate' })) || c.match('index.html');
    }));
  }
});
