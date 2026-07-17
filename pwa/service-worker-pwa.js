// pwa/service-worker-pwa.js
// Service Worker PWA — cache offline des assets statiques
// Différent du service-worker.js de l'extension (contextes incompatibles)
// Stratégie : cache-first pour les assets, réseau direct pour les données.
//
// DURCISSEMENT (revue de durcissement — voir AUDIT_DURCISSEMENT.md).
// Ce fichier existait déjà mais n'était JAMAIS enregistré nulle part —
// `navigator.serviceWorker.register(...)` n'apparaissait dans aucun module
// PWA. « Offline-first » restait donc une promesse documentaire (BRIEF/README)
// sans effet réel : sans réseau, la PWA se comportait comme une page web
// ordinaire sans aucun cache. L'enregistrement est ajouté dans pwa/app.js.
//
// Deux changements corrigent aussi les limites du fichier original :
//   1. CACHE_NAME est maintenant versionné explicitement (bump requis à
//      chaque déploiement qui change des assets, sinon un utilisateur reste
//      figé sur une ancienne version en cache — le handler `activate`
//      supprime tout cache dont le nom diffère de CACHE_NAME courant).
//   2. Le `fetch` handler met désormais en cache les réponses same-origin au
//      fil de la navigation (pas seulement les 5 assets de PRECACHE) : une
//      app vanilla JS sans étape de build ne peut pas maintenir une liste
//      exhaustive et à jour des fichiers à précacher à la main — le cache
//      « au fil de l'eau » s'auto-entretient. /auth/callback (paramètres
//      OAuth transitoires dans l'URL) et les hôtes API externes restent
//      explicitement exclus.

const CACHE_VERSION = 'v1.0.0'; // À bumper à chaque déploiement changeant des assets.
const CACHE_NAME = `pinkin-pwa-${CACHE_VERSION}`;

// Coquille minimale pour un premier chargement offline même AVANT toute
// navigation réussie (installation du SW). Le reste des assets applicatifs
// (core/, ui/, i18n/, lib/leaflet/) est mis en cache au fil de l'eau par le
// handler `fetch` ci-dessous, dès la première visite en ligne.
const PRECACHE = [
  '/pwa/',
  '/pwa/index.html',
  '/pwa/app.js',
  '/pwa/main.js',
  '/pwa/platform-pwa.js',
  '/manifest.webmanifest',
  '/extension/popup/popup.css',
  '/assets/icons/icon32.png',
  '/assets/icons/icon48.png',
  '/assets/icons/icon128.png',
];

// Hôtes jamais interceptés : API tierces (données utilisateur/tokens ne
// doivent jamais transiter par le Cache Storage) et tuiles cartographiques
// (volume trop important, TTL propre au fournisseur).
const NO_CACHE_HOSTS = [
  'googleapis.com',
  'nominatim.openstreetmap.org',
  'tile.openstreetmap.org',
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
  // Supprime tout cache d'une version antérieure — c'est CE mécanisme qui
  // purge réellement les vieux assets, à condition que CACHE_VERSION change.
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // On ne met en cache/interception que les lectures same-origin.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (NO_CACHE_HOSTS.some(host => url.hostname.includes(host))) return; // laisse passer sans cache
  if (url.origin !== self.location.origin) return; // défense en profondeur : jamais d'origine tierce en cache

  // Le callback OAuth porte ?code=&state= dans l'URL — jamais rejoué depuis le
  // cache (la requête suivante aura de toute façon un code différent), et on
  // ne veut aucune ambiguïté sur une page dont l'URL contient un jeton transitoire.
  if (url.pathname.startsWith('/auth/callback')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          // Ne met en cache que les réponses correctes ; clone AVANT toute
          // lecture, une Response ne se lit qu'une fois.
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Hors-ligne et pas en cache : laisse l'erreur réseau remonter
          // normalement (pas de faux-positif silencieux).
          throw new Error('OFFLINE_AND_NOT_CACHED');
        });
    })
  );
});
