const CACHE_NAME = 'gis-sambeng-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './data/tanah_kas_aset_sambeng.geojson'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const reqUrl = event.request.url;
          const sameOrigin = reqUrl.startsWith(self.location.origin);
          const isAsset = ASSETS.some((a) => {
            const full = new URL(a, self.location.origin).href;
            return reqUrl === full || reqUrl === self.location.origin + a.replace(/^\./, '');
          });
          if (sameOrigin && res.ok && (isAsset || reqUrl.includes('/data/')))
            cache.put(event.request, res.clone());
          return res;
        }).catch(() => cache.match('./index.html').then((r) => r || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })));
      })
    )
  );
});
