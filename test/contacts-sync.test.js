// test/contacts-sync.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/services/contacts-sync.js
//
// CONTEXTE. Module écarté motivement en session #6 (« faible valeur,
// délégation à google-people.js »). Re-qualification Lot 2 #3 : le module
// porte en réalité une logique non triviale — TTL de cache 10 min ET un
// fallback cache expiré en cas de coupure réseau. Régressions ici =
// utilisateur sans contacts dès une coupure transitoire.
//
// COUVERTURE.
//   - cache frais (< 10 min) : retour direct sans appel API.
//   - cache absent : fetch Google + persistance.
//   - cache expiré : refetch.
//   - cache expiré + getAccessToken échoue : on RENVOIE le cache plutôt que
//     jeter — c'est la promesse de résilience.
//   - cache absent + getAccessToken échoue : on JETTE (impossible de servir).
//   - clearCache : prochain appel sera un refetch.
//
// MOCKS. Platform en mémoire + google-people.fetchAllContacts stubbé +
// auth.getAccessToken stubbé.
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
    auth: null,
  },
}));

vi.mock('../core/api/google-people.js', () => ({
  fetchAllContacts: vi.fn(),
}));

const { syncContacts, clearCache } = await import('../core/services/contacts-sync.js');
const googleApi = await import('../core/api/google-people.js');

const CACHE_KEY = 'pinkin_contacts_cache';
const TEN_MIN = 10 * 60 * 1000;

function makeAuth(getAccessToken) {
  return { getAccessToken };
}

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('syncContacts — cache TTL 10 min', () => {
  test('cache frais (< 10 min) : retour direct, AUCUN appel API', async () => {
    mockStore.set(CACHE_KEY, {
      contacts: [{ resourceName: 'people/c1', names: [{ displayName: 'Alice' }] }],
      timestamp: Date.now() - 5 * 60 * 1000, // 5 min — frais
    });
    const auth = makeAuth(vi.fn());
    const result = await syncContacts(auth);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Alice');
    expect(auth.getAccessToken).not.toHaveBeenCalled();
    expect(googleApi.fetchAllContacts).not.toHaveBeenCalled();
  });

  test('cache absent : fetch Google et persiste', async () => {
    googleApi.fetchAllContacts.mockResolvedValue([
      { resourceName: 'people/c1', names: [{ displayName: 'Alice' }] },
    ]);
    const auth = makeAuth(vi.fn().mockResolvedValue('tok'));
    const result = await syncContacts(auth);
    expect(result).toHaveLength(1);
    expect(googleApi.fetchAllContacts).toHaveBeenCalledWith('tok');
    expect(mockStore.has(CACHE_KEY)).toBe(true);
    const cached = mockStore.get(CACHE_KEY);
    expect(cached.contacts).toHaveLength(1);
    expect(cached.timestamp).toBeGreaterThan(Date.now() - 1000);
  });

  test('cache expiré (> 10 min) : refetch', async () => {
    mockStore.set(CACHE_KEY, {
      contacts: [{ resourceName: 'people/old', names: [{ displayName: 'Old' }] }],
      timestamp: Date.now() - TEN_MIN - 1000, // périmé
    });
    googleApi.fetchAllContacts.mockResolvedValue([
      { resourceName: 'people/new', names: [{ displayName: 'New' }] },
    ]);
    const auth = makeAuth(vi.fn().mockResolvedValue('tok'));
    const result = await syncContacts(auth);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('New');
    expect(googleApi.fetchAllContacts).toHaveBeenCalledOnce();
  });
});

describe('syncContacts — résilience aux coupures réseau', () => {
  test('cache expiré + auth échoue : renvoie le CACHE périmé (pas d\'erreur)', async () => {
    // Invariant central : un utilisateur hors-ligne ne doit pas perdre ses
    // contacts. Le cache expiré devient le filet.
    mockStore.set(CACHE_KEY, {
      contacts: [{ resourceName: 'people/c1', names: [{ displayName: 'Alice' }] }],
      timestamp: Date.now() - TEN_MIN - 1000,
    });
    const auth = makeAuth(vi.fn().mockRejectedValue(new Error('NETWORK_DOWN')));
    const result = await syncContacts(auth);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Alice');
    expect(googleApi.fetchAllContacts).not.toHaveBeenCalled();
  });

  test('cache ABSENT + auth échoue : JETTE (impossible de servir)', async () => {
    const auth = makeAuth(vi.fn().mockRejectedValue(new Error('NETWORK_DOWN')));
    await expect(syncContacts(auth)).rejects.toThrow('NETWORK_DOWN');
  });
});

describe('clearCache', () => {
  test('vide le cache : prochain syncContacts refetche', async () => {
    mockStore.set(CACHE_KEY, {
      contacts: [{ resourceName: 'people/c1', names: [{ displayName: 'X' }] }],
      timestamp: Date.now(),
    });
    await clearCache();
    expect(mockStore.has(CACHE_KEY)).toBe(false);

    // Vérif comportementale : un syncContacts ultérieur déclenche bien le fetch.
    googleApi.fetchAllContacts.mockResolvedValue([
      { resourceName: 'people/c2', names: [{ displayName: 'Y' }] },
    ]);
    const auth = makeAuth(vi.fn().mockResolvedValue('tok'));
    await syncContacts(auth);
    expect(googleApi.fetchAllContacts).toHaveBeenCalledOnce();
  });
});
