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
// COMPLÉMENT (revue tests 2026-07-17, voir TESTS_DURCISSEMENT.md) — le rapport
// de couverture montrait 48 % de statements : les trois autres chemins qui
// touchent aux données utilisateur restaient nus.
//   - fetchAllContacts : pagination (le contrat de complétude de la sync),
//     401 -> AUTH_EXPIRED.
//   - updateContactAddressAndGeo : read-merge-write sur DEUX champs (adresses
//     + userDefined) — préservation des autres adresses, metadata jamais
//     réécrit, formattedValue omis (l'API le reconstruit), retry etag.
//   - batchRemoveGeo (réversibilité D1) : retire GEO en préservant les autres
//     champs custom — le miroir du bug historique en sens inverse.
//   - fetchSelfEmail : primaire préféré, repli, null si aucune adresse.
//
// MOCKS. `global.fetch` stubbé (helpers/mock-fetch.js) — aucun appel réseau réel.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, test, expect, vi } from 'vitest';
import {
  fetchAllContacts,
  fetchSelfEmail,
  updateContactGeo,
  updateContactAddressAndGeo,
  batchUpdateContactsGeo,
  batchRemoveGeo,
} from '../core/api/google-people.js';
import { jsonResponse } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAllContacts — pagination', () => {
  test('une seule page (pas de nextPageToken) : un appel, contacts retournés', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      connections: [{ resourceName: 'people/c1' }, { resourceName: 'people/c2' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAllContacts('TOKEN');
    expect(result).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Le jeton part en en-tête Authorization, jamais dans l'URL.
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).not.toContain('TOKEN');
    expect(opts.headers.Authorization).toBe('Bearer TOKEN');
  });

  test('deux pages : le pageToken de la 1re réponse est renvoyé, résultats concaténés', async () => {
    // Contrat de COMPLÉTUDE de la sync : si la pagination régresse (pageToken
    // ignoré, boucle coupée), un carnet > 100 contacts perd silencieusement
    // tout ce qui suit la première page.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        connections: [{ resourceName: 'people/c1' }],
        nextPageToken: 'PAGE_2',
      }))
      .mockResolvedValueOnce(jsonResponse({
        connections: [{ resourceName: 'people/c2' }],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAllContacts('TOKEN');
    expect(result.map(c => c.resourceName)).toEqual(['people/c1', 'people/c2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).not.toContain('pageToken');
    expect(fetchMock.mock.calls[1][0]).toContain('pageToken=PAGE_2');
  });

  test('page sans clé connections (compte vide) : tableau vide, pas d\'exception', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})));
    expect(await fetchAllContacts('TOKEN')).toEqual([]);
  });

  test('401 : AUTH_EXPIRED explicite (déclenche le refresh côté appelant)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));
    await expect(fetchAllContacts('EXPIRED')).rejects.toThrow('AUTH_EXPIRED');
  });

  test('403 : l\'erreur porte le corps Google (SERVICE_DISABLED diagnosticable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(
      { error: { status: 'PERMISSION_DENIED', message: 'API disabled' } },
      { ok: false, status: 403 }
    )));
    await expect(fetchAllContacts('T')).rejects.toThrow(/API_ERROR_403.*API disabled/);
  });
});

describe('fetchSelfEmail', () => {
  test('adresse primaire préférée parmi plusieurs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      emailAddresses: [
        { value: 'secondaire@x.org' },
        { value: 'primaire@x.org', metadata: { primary: true } },
      ],
    })));
    expect(await fetchSelfEmail('T')).toBe('primaire@x.org');
  });

  test('pas de primaire : repli sur la première ; aucune adresse : null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      emailAddresses: [{ value: 'seule@x.org' }],
    })));
    expect(await fetchSelfEmail('T')).toBe('seule@x.org');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})));
    expect(await fetchSelfEmail('T')).toBeNull();
  });
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

describe('updateContactAddressAndGeo — read-merge-write sur deux champs', () => {
  test('adresse corrigée en 1re position (champs structurés seuls), autres adresses préservées sans metadata, GEO fusionné', async () => {
    const fetchMock = vi.fn()
      // 1. getContactFresh (addresses + userDefined)
      .mockResolvedValueOnce(jsonResponse({
        etag: 'ETAG_1',
        addresses: [
          { formattedValue: 'Vieille adresse', streetAddress: 'vieux', metadata: { primary: true } },
          { formattedValue: 'Résidence secondaire', streetAddress: 'autre', metadata: { primary: false } },
        ],
        userDefined: [{ key: 'anniversary', value: '2020-01-01' }],
      }))
      // 2. updateContact — on inspecte le body
      .mockResolvedValueOnce(jsonResponse({ etag: 'ETAG_2' }));
    vi.stubGlobal('fetch', fetchMock);

    await updateContactAddressAndGeo('TOKEN', 'people/c1',
      { streetAddress: '10 rue Neuve', postalCode: '69001', city: 'Lyon', country: 'France' },
      { lat: 45.76, lng: 4.83 });

    const [url, patchOpts] = fetchMock.mock.calls[1];
    expect(url).toContain('updatePersonFields=addresses,userDefined');
    const body = JSON.parse(patchOpts.body);
    expect(body.etag).toBe('ETAG_1');

    // Adresse corrigée EN TÊTE : champs structurés uniquement — PAS de
    // formattedValue (l'API People le reconstruit ; l'envoyer produirait des
    // chaînes agglutinées incohérentes), PAS de metadata.
    expect(body.addresses[0]).toEqual({
      streetAddress: '10 rue Neuve', postalCode: '69001', city: 'Lyon', country: 'France',
    });

    // L'autre adresse survit, débarrassée de son metadata (non réécrit).
    expect(body.addresses).toHaveLength(2);
    expect(body.addresses[1]).toEqual({
      formattedValue: 'Résidence secondaire', streetAddress: 'autre',
    });

    // Et le read-merge-write GEO tient aussi sur ce chemin : le champ custom
    // étranger à Pinkin survit, la géoloc s'ajoute.
    expect(body.userDefined).toContainEqual({ key: 'anniversary', value: '2020-01-01' });
    expect(body.userDefined).toContainEqual({ key: 'GEO', value: 'geo:45.76,4.83' });
  });

  test('etag périmé (400) : une reprise puis succès — même filet que updateContactGeo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ etag: 'STALE', addresses: [], userDefined: [] }))
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }))
      .mockResolvedValueOnce(jsonResponse({ etag: 'FRESH', addresses: [], userDefined: [] }))
      .mockResolvedValueOnce(jsonResponse({ etag: 'FRESH2' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateContactAddressAndGeo('T', 'people/c1',
      { city: 'Lyon' }, { lat: 1, lng: 2 });
    expect(result.etag).toBe('FRESH2');
    expect(fetchMock).toHaveBeenCalledTimes(4);
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

describe('batchRemoveGeo — réversibilité (retrait du champ GEO)', () => {
  test('retire GEO mais PRÉSERVE les autres champs custom (miroir de l\'invariant d\'écriture)', async () => {
    // Le retrait passe par la même écriture de tableau entier que l'ajout :
    // un stripGeo qui filtrerait trop large détruirait les champs custom de
    // l'utilisateur exactement comme le bug historique du placeholder.
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('batchGet')) {
        return Promise.resolve(jsonResponse({
          responses: [{
            person: {
              resourceName: 'people/c1', etag: 'E1',
              userDefined: [
                { key: 'anniversary', value: '2020-01-01' },
                { key: 'GEO', value: 'geo:1,1' },
              ],
            },
          }],
        }));
      }
      // batchUpdateContacts — on inspecte le corps envoyé.
      const body = JSON.parse(opts.body);
      const written = body.contacts['people/c1'].userDefined;
      expect(written).toEqual([{ key: 'anniversary', value: '2020-01-01' }]);
      return Promise.resolve(jsonResponse({ updateResult: {} }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await batchRemoveGeo('TOKEN', ['people/c1']);
    expect(result).toEqual({ cleared: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // batchGet + batchUpdateContacts
  });

  test('contact disparu entre la lecture et l\'écriture : compté failed, les autres passent', async () => {
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('batchGet')) {
        // Seul c1 existe encore ; c2 a été supprimé côté Google.
        return Promise.resolve(jsonResponse({
          responses: [{ person: { resourceName: 'people/c1', etag: 'E1', userDefined: [] } }],
        }));
      }
      const body = JSON.parse(opts.body);
      expect(Object.keys(body.contacts)).toEqual(['people/c1']);
      return Promise.resolve(jsonResponse({ updateResult: {} }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await batchRemoveGeo('TOKEN', ['people/c1', 'people/c2']);
    expect(result).toEqual({ cleared: 1, failed: 1 });
  });

  test('échec réseau d\'une tranche : décompte cohérent, pas d\'exception sèche', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NETWORK_DOWN')));
    const result = await batchRemoveGeo('TOKEN', ['people/c1', 'people/c2']);
    expect(result).toEqual({ cleared: 0, failed: 2 });
  });
});
