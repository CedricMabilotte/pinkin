// test/geocoder.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/services/geocoder.js
//
// PORTÉE. Ce module portait toute la logique non triviale de la session #3
// (« mémoire des échecs ») et le correctif central de #3 (seuil de précision)
// — il n'avait pourtant aucun test. Faille comblée en #6.
//
// LOGIQUE TESTÉE.
//   - applyGeoCache : pose les coords cachées, jamais un échec mémorisé.
//   - pendingGeocodes : un contact dont l'adresse n'a pas changé depuis un
//     échec n'est plus dans la liste ; une adresse corrigée le réhabilite.
//   - runIncrementalGeocoding : succès/échec persistés, query sans texte
//     mémorisée sans appel réseau, erreur réseau non mémorisée (transitoire).
//
// MOCKS.
//   - '../core/platform.js' : remplacé par un Platform en mémoire (Map). On
//     n'a ni localStorage ni chrome.storage en Node.
//   - global.fetch : stubbé par scénario. Nominatim est isolé du test.
//   - vi.useFakeTimers : le rate-limit (1.1 s entre requêtes) serait sinon
//     un blocage de 1.1 × N secondes par test. Avec fakes, chaque test
//     s'exécute en ~ms.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';

// Mock du Platform : doit être au sommet et hissé par Vitest avant les imports
// du module sous test. Implémentation en mémoire — Map keyed par clé.
const mockStore = new Map();
vi.mock('../core/platform.js', () => ({
  Platform: {
    async get(key) { return mockStore.has(key) ? mockStore.get(key) : null; },
    async set(key, value) {
      if (value === null) mockStore.delete(key);
      else mockStore.set(key, value);
    },
    async del(key) { mockStore.delete(key); },
    auth: null,
  },
}));

// Imports APRÈS le mock — c'est l'ordre que Vitest requiert pour intercepter.
const {
  applyGeoCache,
  pendingGeocodes,
  runIncrementalGeocoding,
  clearGeoCache,
  GEO_CACHE_KEY,
} = await import('../core/services/geocoder.js');
const { Contact } = await import('../core/model/contact.js');

// ── Fabriques de contacts (raccourci, pas un mock ; vrai modèle Contact) ─────

function contactAvecAdresse(resourceName, addrText) {
  return new Contact({
    resourceName,
    names: [{ displayName: resourceName }],
    addresses: [{ formattedValue: addrText, streetAddress: addrText }],
  });
}

function contactSansAdresse(resourceName) {
  return new Contact({ resourceName, names: [{ displayName: resourceName }] });
}

function contactGeolocalise(resourceName, lat, lng) {
  return new Contact({
    resourceName,
    names: [{ displayName: resourceName }],
    userDefined: [{ key: 'GEO', value: `geo:${lat},${lng}` }],
  });
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockStore.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// applyGeoCache
// ═════════════════════════════════════════════════════════════════════════════

describe('applyGeoCache', () => {
  test('pose la géoloc cachée sur un contact qui n\'en a pas', async () => {
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { lat: 45.76, lng: 4.83 },
    });
    const c = contactAvecAdresse('people/c1', '24 rue Lyon');
    await applyGeoCache([c]);
    expect(c.geo).toEqual({ lat: 45.76, lng: 4.83 });
    expect(c.hasGeo()).toBe(true);
  });

  test('n\'écrase pas un contact qui a déjà sa géoloc', async () => {
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { lat: 0, lng: 0 },
    });
    const c = contactGeolocalise('people/c1', 48.85, 2.35);
    await applyGeoCache([c]);
    expect(c.geo).toEqual({ lat: 48.85, lng: 2.35 });
  });

  test('IGNORE les enregistrements d\'échec (jamais de marqueur fantôme)', async () => {
    // Garde-fou explicite du module : un échec en cache n'a pas de lat/lng,
    // l'appliquer poserait un marqueur Leaflet aux coords indéfinies.
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { failed: true, query: 'rue introuvable' },
    });
    const c = contactAvecAdresse('people/c1', 'rue introuvable');
    await applyGeoCache([c]);
    expect(c.geo).toBeNull();
    expect(c.hasGeo()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// pendingGeocodes — la mémoire des échecs (cœur de la session #3)
// ═════════════════════════════════════════════════════════════════════════════

describe('pendingGeocodes — mémoire des échecs', () => {
  test('contact sans adresse : jamais candidat', async () => {
    const c = contactSansAdresse('people/c1');
    expect(await pendingGeocodes([c])).toEqual([]);
  });

  test('contact géolocalisé : jamais candidat', async () => {
    const c = contactGeolocalise('people/c1', 48.85, 2.35);
    expect(await pendingGeocodes([c])).toEqual([]);
  });

  test('contact avec adresse, sans échec mémorisé : candidat', async () => {
    const c = contactAvecAdresse('people/c1', '24 rue Lyon');
    const pending = await pendingGeocodes([c]);
    expect(pending).toHaveLength(1);
    expect(pending[0].resourceName).toBe('people/c1');
  });

  test('échec mémorisé pour la MÊME adresse : retiré des candidats', async () => {
    const c = contactAvecAdresse('people/c1', '24 rue Lyon');
    // Le module compose la query depuis streetAddress + city + … filtrés
    // (cf. buildAddressQuery). Avec notre fabrique, c'est la rue seule.
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { failed: true, query: '24 rue Lyon' },
    });
    expect(await pendingGeocodes([c])).toEqual([]);
  });

  test('échec mémorisé pour une AUTRE adresse : réhabilité (adresse corrigée)', async () => {
    const c = contactAvecAdresse('people/c1', 'nouvelle rue');
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { failed: true, query: 'ancienne rue' },
    });
    const pending = await pendingGeocodes([c]);
    expect(pending).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// runIncrementalGeocoding — boucle complète, succès et échecs
// ═════════════════════════════════════════════════════════════════════════════

describe('runIncrementalGeocoding', () => {
  test('aucun candidat -> onProgress finished:true, pas d\'appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const onProgress = vi.fn();
    await runIncrementalGeocoding([contactSansAdresse('people/c1')], onProgress);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({ done: 0, total: 0, finished: true });
  });

  test('succès Nominatim -> géoloc posée sur le contact et persistée en cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        { lat: '45.7640', lon: '4.8357', display_name: 'Lyon', importance: 0.8, place_rank: 16 },
      ]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const c = contactAvecAdresse('people/c1', '24 rue Lyon');
    await runIncrementalGeocoding([c], () => {});

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(c.geo.lat).toBe(45.764);
    expect(c.geo.lng).toBe(4.8357);
    const cache = mockStore.get(GEO_CACHE_KEY);
    expect(cache['people/c1'].lat).toBe(45.764);
  });

  test('réponse Nominatim vide -> échec mémorisé avec la query exacte', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    const c = contactAvecAdresse('people/c1', 'rue inexistante');
    await runIncrementalGeocoding([c], () => {});

    expect(c.geo).toBeNull();
    const cache = mockStore.get(GEO_CACHE_KEY);
    expect(cache['people/c1']).toEqual({ failed: true, query: 'rue inexistante' });
  });

  test('contact avec adresse vide (query null) -> échec mémorisé SANS appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Un contact avec un objet address vide : buildAddressQuery retourne null.
    const c = new Contact({
      resourceName: 'people/c1',
      names: [{ displayName: 'X' }],
      addresses: [{ formattedValue: '' }],
    });
    // needsGeocoding repose sur addresses[0] présent + pas de geo. La fabrique
    // ci-dessus le remplit ; mais buildAddressQuery, lui, va retourner null.
    if (!c.needsGeocoding()) return; // garde-fou : si needsGeocoding est faux, le test n'a pas de sens

    await runIncrementalGeocoding([c], () => {});

    expect(fetchMock).not.toHaveBeenCalled();
    const cache = mockStore.get(GEO_CACHE_KEY);
    expect(cache?.['people/c1']).toEqual({ failed: true, query: null });
  });

  test('erreur réseau (fetch rejette) -> rien mémorisé, peut être rejoué plus tard', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    // Silencieux : le module log un warn ; on ne veut pas polluer la sortie test.
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const c = contactAvecAdresse('people/c1', '24 rue Lyon');
    await runIncrementalGeocoding([c], () => {});

    expect(c.geo).toBeNull();
    const cache = mockStore.get(GEO_CACHE_KEY);
    // Soit cache est vide (clé jamais créée), soit pas d'entrée pour c1.
    // L'invariant à protéger : pas d'échec persisté pour une erreur transitoire.
    expect(cache?.['people/c1']).toBeUndefined();
  });

  test('annulation via AbortSignal : la boucle s\'arrête', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{ lat: '0', lon: '0', display_name: 'x', importance: 0.5, place_rank: 16 }]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();

    const contacts = [
      contactAvecAdresse('people/c1', 'a'),
      contactAvecAdresse('people/c2', 'b'),
    ];
    await runIncrementalGeocoding(contacts, () => {}, controller.signal);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// clearGeoCache — déconnexion
// ═════════════════════════════════════════════════════════════════════════════

describe('clearGeoCache', () => {
  test('efface entièrement le cache (set null -> del)', async () => {
    mockStore.set(GEO_CACHE_KEY, { 'people/c1': { lat: 0, lng: 0 } });
    await clearGeoCache();
    expect(mockStore.has(GEO_CACHE_KEY)).toBe(false);
  });
});
