// Minimal service worker so the site can be installed on Android. Caches the shell only.
const CACHE = 'albaiwa-v1';
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/']))));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/.netlify/functions/')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
