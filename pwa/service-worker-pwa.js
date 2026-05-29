// pwa/service-worker-pwa.js
// Service Worker PWA — cache offline des assets statiques
// Différent du service-worker.js de l'extension (contextes incompatibles)
// Stratégie : cache-first pour les assets, network-first pour les données

const CACHE_NAME = 'pinkin-v1';

// Assets à mettre en cache à l'installation
const PRECACHE = [
  '/',
  '/pwa/index.html',
  '/extension/popup/popup.css',
  '/assets/icons/icon32.png',
  '/assets/icons/icon48.png',
  '/assets/icons/icon128.png'
];

self.addEventListener('install', event => {
  // allSettled + add() un par un : un asset manquant (chemin non déployé) ne
  // doit pas faire échouer toute l'installation — cache.addAll(), lui, est
  // atomique et planterait le service worker entier.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Supprimer les anciens caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Ne pas intercepter les appels API Google ou Nominatim
  const url = new URL(event.request.url);
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('nominatim.openstreetmap.org') ||
      url.hostname.includes('tile.openstreetmap.org')) {
    return; // Laisse passer sans cache
  }

  // Cache-first pour les assets statiques
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
