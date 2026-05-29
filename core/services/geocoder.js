// core/services/geocoder.js
// Géocodage incrémental via Nominatim (OpenStreetMap)
// Respecte le rate-limit Nominatim : 1 requête/seconde max
// Cache géo persistant — un contact déjà géocodé, ou en échec connu, n'est
// jamais retraité (cf. « Mémoire des échecs » plus bas).

import { Platform } from '../platform.js';
import { GeoPoint } from '../model/geopoint.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const DELAY_MS  = 1100; // 10% de marge sur la limite 1 req/s de Nominatim
// Exporté : la publication groupée (vcard-writer.js) lit ce même cache.
// Map resourceName → soit une coordonnée { lat, lng, … }, soit un
// enregistrement d'échec { failed:true, query } (cf. « Mémoire des échecs »).
export const GEO_CACHE_KEY = 'pinkin_geo_cache';

async function loadGeoCache() {
  return await Platform.get(GEO_CACHE_KEY) ?? {};
}

async function saveGeoCache(cache) {
  await Platform.set(GEO_CACHE_KEY, cache);
}

// Vide le cache de géocodage. Appelé à la déconnexion : sans ça, les
// localisations d'un compte resteraient lisibles après changement d'utilisateur.
export async function clearGeoCache() {
  await Platform.set(GEO_CACHE_KEY, null);
}

// Applique le cache de géocodage aux contacts : un contact sans champ GEO mais
// déjà localisé lors d'une session précédente récupère ses coordonnées du cache.
// À appeler AVANT le rendu de la carte — sinon un contact dont la géoloc n'est
// QUE dans le cache (géocodé mais pas écrit en champ GEO, ou GEO retiré) ne
// serait jamais dessiné : la carte se rend avant que le cache soit posé.
export async function applyGeoCache(contacts) {
  const geoCache = await loadGeoCache();
  contacts.forEach(c => {
    const cached = geoCache[c.resourceName];
    // N'appliquer QU'une vraie coordonnée. Le cache contient désormais aussi
    // des enregistrements d'échec { failed:true } : les poser comme géoloc
    // créerait un marqueur fantôme aux coordonnées indéfinies.
    if (!c.hasGeo() && cached && typeof cached.lat === 'number') {
      c.geo = cached;
    }
  });
}

/**
 * Construit la requête adresse depuis le premier champ address du contact.
 * Essaie plusieurs niveaux de précision — Nominatim retourne au moins ville+pays.
 */
function buildAddressQuery(contact) {
  const addr = contact.addresses[0];
  if (!addr) return null;

  const structured = [
    addr.streetAddress,
    addr.city,
    addr.region,
    addr.postalCode,
    addr.country
  ].filter(Boolean).join(', ');

  // Une adresse corrigée par l'utilisateur peut n'avoir que formattedValue
  // (texte libre saisi en B5) ; on l'utilise en repli.
  return structured || addr.formattedValue || null;
}

// ── Mémoire des échecs ────────────────────────────────────────────────────────

// Un contact reste-t-il à géocoder ? Oui s'il a une adresse et pas de GEO —
// SAUF si on a déjà enregistré un échec pour CETTE adresse précise. Lier
// l'échec au texte de la requête est le pivot du correctif : une adresse
// inchangée n'est plus jamais rejouée (fini les contacts irrésolubles
// re-géocodés à chaque ouverture), mais une adresse corrigée — donc un texte
// de requête différent — redevient candidate.
function stillNeedsGeocoding(contact, geoCache) {
  if (!contact.needsGeocoding()) return false;
  const cached = geoCache[contact.resourceName];
  if (cached?.failed) return cached.query !== buildAddressQuery(contact);
  return true;
}

// Liste des contacts encore à géocoder, échecs mémorisés exclus. Exporté pour
// que popup.js et runIncrementalGeocoding partagent EXACTEMENT le même filtre :
// deux définitions divergentes donneraient des décomptes incohérents entre ce
// que l'UI annonce et ce que le géocodeur traite réellement.
export async function pendingGeocodes(contacts) {
  const geoCache = await loadGeoCache();
  return contacts.filter(c => stillNeedsGeocoding(c, geoCache));
}

/**
 * Géocode une adresse via Nominatim.
 * Retourne un GeoPoint ou null si aucun résultat.
 */
export async function geocodeAddress(query, signal) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  // Timeout dur (10 s) combiné au signal d'annulation de l'appelant : une
  // requête Nominatim muette ne doit pas figer le géocodage indéfiniment.
  const timeout = AbortSignal.timeout(10000);
  const stop    = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Pinkin/1.0 (pinkin.org; personal contact map)',
      'Accept-Language': 'fr,en'
    },
    signal: stop
  });

  if (!res.ok) throw new Error(`NOMINATIM_${res.status}`);

  const data = await res.json();
  if (!data.length) return null;

  return GeoPoint.fromNominatim(data[0]);
}

/**
 * Lance le géocodage incrémental de tous les contacts sans GEO.
 *
 * @param {Contact[]} contacts  - Liste complète des contacts
 * @param {Function}  onProgress - Callback({ done, total, contact, finished })
 * @param {AbortSignal} signal  - Pour annuler proprement (fermeture popup)
 */
export async function runIncrementalGeocoding(contacts, onProgress, signal) {
  // Pose les géoloc déjà connues (idempotent si l'appelant l'a déjà fait).
  await applyGeoCache(contacts);
  const geoCache = await loadGeoCache();   // rechargé pour la persistance ci-dessous

  const toGeocode = contacts.filter(c => stillNeedsGeocoding(c, geoCache));

  if (!toGeocode.length) {
    onProgress?.({ done: 0, total: 0, finished: true });
    return;
  }

  let done = 0;

  for (const contact of toGeocode) {
    if (signal?.aborted) break;

    const query = buildAddressQuery(contact);

    // Adresse sans texte exploitable : échec immédiat, mémorisé, sans appel réseau.
    if (!query) {
      geoCache[contact.resourceName] = { failed: true, query: null };
      await saveGeoCache(geoCache);
      done++;
      onProgress?.({ done, total: toGeocode.length, contact, finished: done === toGeocode.length });
      continue;
    }

    try {
      const geo = await geocodeAddress(query, signal);

      if (geo) {
        contact.geo = geo;
        geoCache[contact.resourceName] = geo;
      } else {
        // Réponse Nominatim vide : l'adresse, en l'état, ne résout vers rien.
        // On MÉMORISE l'échec, lié au texte de la requête. Sans cette mémoire,
        // le contact serait redéclaré « à géocoder » à chaque ouverture et
        // rejoué indéfiniment. Avec elle, il est ignoré tant que son adresse
        // ne change pas — une correction (texte différent) le réhabilite.
        geoCache[contact.resourceName] = { failed: true, query };
      }
      // Persistance APRÈS CHAQUE contact — succès comme échec. Toute écriture
      // différée (par lots, ou « à la fin ») est une promesse asynchrone qui ne
      // survit pas à la fermeture du contexte (onglet fermé, onglet tué sous
      // pression mémoire) : le travail non écrit serait perdu en silence. Le
      // coût est négligeable — ~25 Ko réécrits pendant le temps mort qu'impose
      // de toute façon le rate-limit Nominatim.
      await saveGeoCache(geoCache);
    } catch (err) {
      // Échec TRANSITOIRE (Nominatim indisponible, rate-limit, réseau) : on ne
      // mémorise PAS — il faut pouvoir retenter à la prochaine passe. On
      // journalise et on poursuit, sans bloquer le reste du lot.
      console.warn(`Geocoding failed for ${contact.displayName}:`, err.message);
    }

    done++;
    onProgress?.({
      done,
      total: toGeocode.length,
      contact,
      finished: done === toGeocode.length
    });

    if (done < toGeocode.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Aucune sauvegarde finale : le cache est déjà à jour, chaque contact ayant
  // été persisté dans la foulée de son géocodage (cf. boucle ci-dessus). Plus
  // de fenêtre de perte à la sortie de la boucle, qu'elle soit normale ou
  // annulée.
}
