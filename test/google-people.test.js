// test/google-people.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/api/google-people.js — jusqu'ici SANS AUCUN test.
// Ajouté lors d'une revue de durcissement (voir AUDIT_DURCISSEMENT.md).
//
// POURQUOI EN PRIORITÉ. Ce module porte le correctif read-merge-write : avant
// lui, une écriture du champ GEO envoyait un `userDefined` ne contenant QUE
// GEO, et l'API People remplace le tableau entier — les autres champs
// personnalisés de l'utilisateur (créés dans Google Contacts, hors Pinkin)
// étaient donc silencieusement détruits. C'est un bug qui a déjà cassé des
// données utilisateur réelles une fois ; il mérite un test qui l'empêche de
// revenir, plutôt qu'une simple relecture de code à chaque session.
//
// COUVERTURE (volontairement ciblée, pas exhaustive) :
//   - updateContactGeo : préserve les userDefined non-GEO existants (le coeur
//     de l'invariant), retry unique sur etag périmé (API_ERROR_400) puis jette,
//     401 -> AUTH_EXPIRED explicite.
//   - batchUpdateContactsGeo : découpe en tranches de 200 (BATCH_LIMIT), une
//     tranche en échec réseau ne bloque pas les tranches suivantes.
//
// MOCKS. `global.fetch` stubbé — aucun appel réseau réel.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, test, expect, vi } from 'vitest';
import {
  updateContactGeo,
  batchUpdateContactsGeo,
} from '../core/api/google-people.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('updateContactGeo — read-merge-write', () => {
  test('préserve les userDefined non-GEO existants (invariant central)', async () => {
    const fetchMock = vi.fn()
      // 1. getContactFresh — le contact a déjà un champ custom "anniversary"
      .mockResolvedValueOnce(jsonResponse({
        etag: 'ETAG_1',
        userDefined: [
          { key: 'anniversary', value: '2020-01-01' },
          { key: 'GEO', value: 'geo:1,1' }, // ancienne géoloc, doit être remplacée
        ],
      }))
      // 2. updateContact — on inspecte le body envoyé
      .mockResolvedValueOnce(jsonResponse({ etag: 'ETAG_2' }));
    vi.stubGlobal('fetch', fetchMock);

    await updateContactGeo('TOKEN', 'people/c1', { lat: 48.85, lng: 2.35 });

    const [, patchOpts] = fetchMock.mock.calls[1];
    const body = JSON.parse(patchOpts.body);
    expect(body.etag).toBe('ETAG_1');
    // Le champ custom étranger à Pinkin doit survivre intact.
    expect(body.userDefined).toContainEqual({ key: 'anniversary', value: '2020-01-01' });
    // La nouvelle géoloc remplace l'ancienne, une seule entrée GEO au total.
    const geoEntries = body.userDefined.filter(f => f.key === 'GEO');
    expect(geoEntries).toHaveLength(1);
    expect(geoEntries[0].value).toBe('geo:48.85,2.35');
  });

  test('etag périmé (400) : une reprise, puis succès', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ etag: 'STALE', userDefined: [] })) // read #1
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }))      // write #1 — étag périmé
      .mockResolvedValueOnce(jsonResponse({ etag: 'FRESH', userDefined: [] }))  // read #2
      .mockResolvedValueOnce(jsonResponse({ etag: 'FRESH2' }));                 // write #2 — succès
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateContactGeo('TOKEN', 'people/c1', { lat: 1, lng: 2 });
    expect(result.etag).toBe('FRESH2');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('etag périmé deux fois de suite : jette (une seule reprise, pas de boucle infinie)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ etag: 'E1', userDefined: [] }))
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }))
      .mockResolvedValueOnce(jsonResponse({ etag: 'E2', userDefined: [] }))
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateContactGeo('TOKEN', 'people/c1', { lat: 1, lng: 2 }))
      .rejects.toThrow(/API_ERROR_400/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('401 : erreur AUTH_EXPIRED explicite (distinguable d\'un échec réseau générique)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));
    await expect(updateContactGeo('EXPIRED_TOKEN', 'people/c1', { lat: 1, lng: 2 }))
      .rejects.toThrow('AUTH_EXPIRED');
  });
});

describe('batchUpdateContactsGeo — découpage en tranches', () => {
  test('201 contacts : découpe en 2 tranches (200 + 1), pas une seule requête géante', async () => {
    const entries = Array.from({ length: 201 }, (_, i) => ({
      resourceName: `people/c${i}`,
      geo: { lat: i, lng: i },
    }));

    const fetchMock = vi.fn().mockImplementation((url) => {
      // batchGet (GET) puis batchUpdateContacts (POST), pour chaque tranche.
      if (url.includes('batchGet') || url.includes('resourceNames')) {
        // Renvoie une personne par resourceName demandé (introspection via l'URL).
        const params = new URL(url).searchParams.getAll('resourceNames');
        const responses = params.map(rn => ({ person: { resourceName: rn, etag: 'E', userDefined: [] } }));
        return Promise.resolve(jsonResponse({ responses }));
      }
      return Promise.resolve(jsonResponse({ updateResult: {} }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await batchUpdateContactsGeo('TOKEN', entries);
    expect(result.written + result.failed).toBe(201);

    // 2 tranches * (1 batchGet + 1 batchUpdateContacts) = 4 appels réseau.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('une tranche en échec réseau ne bloque pas le décompte global (comptée en failed)', async () => {
    const entries = [{ resourceName: 'people/c1', geo: { lat: 1, lng: 1 } }];
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NETWORK_DOWN')));

    const result = await batchUpdateContactsGeo('TOKEN', entries);
    expect(result).toEqual({ written: 0, failed: 1 });
  });
});
