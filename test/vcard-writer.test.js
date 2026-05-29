// test/vcard-writer.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/services/vcard-writer.js
//
// ENJEU. Ce module porte le « garde-fou de confiance » (MIN_PLACE_RANK = 13)
// calibré sur mesure réelle en session #3 — l'invariant central de l'écriture
// dans Google : « jamais inscrire une coordonnée plus grossière que la
// ville ». Et il porte la séparation publishGeoCache (écarte les échecs avant
// décompte) ↔ correctContactAddress (pas de garde-fou : intention explicite
// de l'utilisateur). Régressions ici = pollution du carnet permanent.
//
// MOCKS.
//   - '../core/platform.js' : Platform.auth.getAccessToken + storage en mémoire.
//   - '../core/api/google-people.js' : on vérifie QUE LES BONS args sont passés,
//     on n'éprouve pas la People API elle-même.
//   - '../core/services/geocoder.js' : on n'importe que GEO_CACHE_KEY et on
//     stube geocodeAddress (correctContactAddress).
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';

const mockStore = new Map();

vi.mock('../core/platform.js', () => ({
  Platform: {
    async get(key) { return mockStore.has(key) ? mockStore.get(key) : null; },
    async set(key, value) {
      if (value === null) mockStore.delete(key);
      else mockStore.set(key, value);
    },
    async del(key) { mockStore.delete(key); },
    auth: {
      async getAccessToken() { return 'fake-token'; },
    },
  },
}));

// API Google : on intercepte tout pour interroger les calls.
vi.mock('../core/api/google-people.js', () => ({
  updateContactGeo: vi.fn(async () => ({})),
  batchUpdateContactsGeo: vi.fn(async (_token, entries) => ({
    written: entries.length, failed: 0,
  })),
  updateContactAddressAndGeo: vi.fn(async () => ({})),
  batchRemoveGeo: vi.fn(async (_token, targets) => ({
    cleared: targets.length, failed: 0,
  })),
  fetchAllContacts: vi.fn(async () => []),
}));

// Stub partiel : on ne mock pas tout le module geocoder (on a besoin de
// GEO_CACHE_KEY tel qu'il est) ; on remplace seulement geocodeAddress.
vi.mock('../core/services/geocoder.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, geocodeAddress: vi.fn() };
});

const {
  isConfidentEnough, writeGeoToContact, publishGeoCache,
  correctContactAddress, removeAllGeoFields,
} = await import('../core/services/vcard-writer.js');
const googleApi = await import('../core/api/google-people.js');
const { geocodeAddress, GEO_CACHE_KEY } = await import('../core/services/geocoder.js');

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// isConfidentEnough — le cœur de la barre de confiance
// ═════════════════════════════════════════════════════════════════════════════

describe('isConfidentEnough — seuil MIN_PLACE_RANK = 13 (ville)', () => {
  test('ville (placeRank 14-16) : OK', () => {
    expect(isConfidentEnough({ lat: 45.76, lng: 4.83, placeRank: 16 })).toBe(true);
  });

  test('rue (placeRank 26) : OK', () => {
    expect(isConfidentEnough({ lat: 45.76, lng: 4.83, placeRank: 26 })).toBe(true);
  });

  test('département/région (placeRank 8-12) : REFUSÉ', () => {
    expect(isConfidentEnough({ lat: 45.5, lng: 4.5, placeRank: 12 })).toBe(false);
    expect(isConfidentEnough({ lat: 45.5, lng: 4.5, placeRank: 8 })).toBe(false);
  });

  test('pays (placeRank 4) : REFUSÉ', () => {
    expect(isConfidentEnough({ lat: 46, lng: 2, placeRank: 4 })).toBe(false);
  });

  test('placeRank inconnu (null) : autorisé — « l\'inconnu n\'est pas le douteux »', () => {
    expect(isConfidentEnough({ lat: 45.76, lng: 4.83, placeRank: null })).toBe(true);
    expect(isConfidentEnough({ lat: 45.76, lng: 4.83 })).toBe(true);
  });

  test('coordonnée hors bornes : REFUSÉ même si placeRank très fin', () => {
    expect(isConfidentEnough({ lat: 91, lng: 0, placeRank: 30 })).toBe(false);
    expect(isConfidentEnough({ lat: 0, lng: 181, placeRank: 30 })).toBe(false);
  });

  test('NaN : REFUSÉ', () => {
    expect(isConfidentEnough({ lat: NaN, lng: 0, placeRank: 30 })).toBe(false);
  });

  test('geo null/undefined : REFUSÉ', () => {
    expect(isConfidentEnough(null)).toBe(false);
    expect(isConfidentEnough(undefined)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// writeGeoToContact — écriture unitaire opt-in
// ═════════════════════════════════════════════════════════════════════════════

describe('writeGeoToContact', () => {
  test('geo précis -> écrit dans Google avec le token', async () => {
    const contact = { resourceName: 'people/c1' };
    const geo = { lat: 45.76, lng: 4.83, placeRank: 16 };
    const result = await writeGeoToContact(contact, geo);
    expect(result).toEqual({ written: true });
    expect(googleApi.updateContactGeo).toHaveBeenCalledWith('fake-token', 'people/c1', geo);
  });

  test('geo trop grossier -> non écrit, raison LOW_CONFIDENCE', async () => {
    const result = await writeGeoToContact(
      { resourceName: 'people/c1' },
      { lat: 46, lng: 2, placeRank: 4 }
    );
    expect(result).toEqual({ written: false, reason: 'LOW_CONFIDENCE' });
    expect(googleApi.updateContactGeo).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// publishGeoCache — séparation échecs / imprécis (correctif #3)
// ═════════════════════════════════════════════════════════════════════════════

describe('publishGeoCache — bilan { written, skipped, failed }', () => {
  test('cache vide -> rien à écrire, bilan à zéro', async () => {
    const r = await publishGeoCache('tok');
    expect(r).toEqual({ written: 0, skipped: 0, failed: 0 });
  });

  test('échecs de géocodage NE SONT PAS comptés dans skipped', async () => {
    // Le correctif #3 : un échec n'est pas un « ignoré à l'écriture », c'est
    // qu'il n'a jamais été candidat. skipped doit rester à 0.
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { failed: true, query: 'rue inexistante' },
      'people/c2': { failed: true, query: 'autre' },
    });
    const r = await publishGeoCache('tok');
    expect(r).toEqual({ written: 0, skipped: 0, failed: 0 });
    expect(googleApi.batchUpdateContactsGeo).not.toHaveBeenCalled();
  });

  test('mélange écrits / imprécis / échecs : bilan exact', async () => {
    mockStore.set(GEO_CACHE_KEY, {
      'people/c1': { lat: 45.76, lng: 4.83, placeRank: 16 }, // ville : écrit
      'people/c2': { lat: 46.0,  lng: 2.0,  placeRank: 4  }, // pays : skipped
      'people/c3': { failed: true, query: 'x' },             // échec : ni l'un ni l'autre
      'people/c4': { lat: 48.85, lng: 2.35, placeRank: 26 }, // rue : écrit
    });
    const r = await publishGeoCache('tok');
    expect(r).toEqual({ written: 2, skipped: 1, failed: 0 });

    // Seuls les 2 toWrite sont passés en lot — pas c2 (imprécis), pas c3 (échec).
    const callArgs = googleApi.batchUpdateContactsGeo.mock.calls[0][1];
    expect(callArgs.map(e => e.resourceName).sort()).toEqual(['people/c1', 'people/c4']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// correctContactAddress — correction explicite par l'utilisateur
// ═════════════════════════════════════════════════════════════════════════════

describe('correctContactAddress', () => {
  test('géocode, écrit adresse + geo, met à jour le cache', async () => {
    geocodeAddress.mockResolvedValue({ lat: 45.76, lng: 4.83, placeRank: 16 });

    const contact = { resourceName: 'people/c1' };
    const address = { streetAddress: '24 rue X', city: 'Lyon', country: 'France' };
    const geo = await correctContactAddress(contact, address);

    expect(geo).toEqual({ lat: 45.76, lng: 4.83, placeRank: 16 });
    expect(geocodeAddress).toHaveBeenCalledWith('24 rue X, Lyon, France');
    expect(googleApi.updateContactAddressAndGeo).toHaveBeenCalledWith(
      'fake-token', 'people/c1', address, geo,
    );
    expect(mockStore.get(GEO_CACHE_KEY)['people/c1']).toEqual(geo);
  });

  test('géocodage invalide -> throw GEOCODE_FAILED, AUCUNE écriture Google', async () => {
    geocodeAddress.mockResolvedValue(null);
    await expect(
      correctContactAddress({ resourceName: 'people/c1' }, { city: 'X' }),
    ).rejects.toThrow('GEOCODE_FAILED');
    expect(googleApi.updateContactAddressAndGeo).not.toHaveBeenCalled();
  });

  test('PAS de garde-fou de confiance (intention explicite) — accepte une ville imprécise', async () => {
    // Même une coord avec placeRank très grossier passe : l'utilisateur a validé.
    geocodeAddress.mockResolvedValue({ lat: 46, lng: 2, placeRank: 4 });
    const geo = await correctContactAddress(
      { resourceName: 'people/c1' },
      { country: 'France' },
    );
    expect(geo.placeRank).toBe(4);
    expect(googleApi.updateContactAddressAndGeo).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// removeAllGeoFields — réversibilité
// ═════════════════════════════════════════════════════════════════════════════

describe('removeAllGeoFields', () => {
  test('aucun contact GEO -> rien à retirer', async () => {
    googleApi.fetchAllContacts.mockResolvedValue([
      { resourceName: 'people/c1', userDefined: [] },
      { resourceName: 'people/c2' },
    ]);
    const r = await removeAllGeoFields('tok');
    expect(r).toEqual({ cleared: 0, failed: 0 });
    expect(googleApi.batchRemoveGeo).not.toHaveBeenCalled();
  });

  test('cible uniquement les contacts avec userDefined GEO', async () => {
    googleApi.fetchAllContacts.mockResolvedValue([
      { resourceName: 'people/c1', userDefined: [{ key: 'GEO', value: 'geo:0,0' }] },
      { resourceName: 'people/c2', userDefined: [{ key: 'AUTRE', value: 'x' }] },
      { resourceName: 'people/c3', userDefined: [{ key: 'GEO', value: 'geo:1,1' }] },
    ]);
    await removeAllGeoFields('tok');
    expect(googleApi.batchRemoveGeo).toHaveBeenCalledWith(
      'tok', ['people/c1', 'people/c3'],
    );
  });
});
