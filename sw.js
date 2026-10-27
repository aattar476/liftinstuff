// Bump CACHE_NAME on every release so phones drop the old files.
const CACHE_NAME = 'liftinstuff-v3';
const ASSETS = [
  './', './index.html', './manifest.json', './css/styles.css',
  './js/firebase-config.js', './js/program.js', './js/timers.js', './js/db.js',
  './js/app.js', './js/runner.js', './js/home.js', './js/progress.js', './js/main.js',
];
// Third-party files that never change for a given URL: fonts and the Firebase SDK.
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // App files: network first so updates arrive, cache when offline.
    // 'no-cache' makes the browser check with the server instead of reusing
    // its own HTTP cache, so a deploy shows up on the next launch.
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
  } else if (RUNTIME_HOSTS.includes(url.hostname)) {
    // Fonts and SDK: cache first (they're versioned), so the gym's dead zone doesn't matter.
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Everything else (Firebase database traffic) goes straight to the network.
});
