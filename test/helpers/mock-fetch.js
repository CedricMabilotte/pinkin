// test/helpers/mock-fetch.js
// ─────────────────────────────────────────────────────────────────────────────
// Mock de `fetch` — helper partagé de la couche unit/DOM.
//
// POURQUOI. Les modules réseau (core/auth/pkce-auth.js, core/api/
// google-people.js) appellent `fetch` global ; leurs tests le stubbent par
// des réponses factices. `jsonResponse` était dupliqué à l'identique dans
// deux fichiers — source canonique unique désormais ici (extraction : revue
// tests 2026-07-17, voir TESTS_DURCISSEMENT.md).
//
// CONTRAT. `jsonResponse` fabrique un objet réponse MINIMAL : uniquement les
// membres que le code de prod consomme (ok, status, json(), text()). C'est
// voulu — si un module se met à lire r.headers ou r.blob(), le test casse
// explicitement et on étend le contrat ici, en un seul endroit.
//
// NETTOYAGE. Tout stub posé via vi.stubGlobal doit être levé après chaque
// test : `afterEach(() => { vi.unstubAllGlobals(); })` dans le fichier
// appelant (convention, voir test/README.md).
// ─────────────────────────────────────────────────────────────────────────────

import { vi } from 'vitest';

/**
 * Objet réponse fetch factice, façon API Google (JSON).
 *   jsonResponse({ access_token: 'AT' })                        -> 200 OK
 *   jsonResponse({ error: 'invalid_grant' }, { ok: false, status: 400 })
 */
export function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/**
 * Stubbe `fetch` global pour renvoyer TOUJOURS la même réponse, et retourne
 * le vi.fn() pour inspection (URL appelée, corps envoyé, nombre d'appels).
 * Pour des séquences (réponses différentes par appel), construire le vi.fn()
 * à la main avec mockResolvedValueOnce en chaîne, puis stubGlobal — voir
 * test/google-people.test.js pour le motif.
 */
export function mockFetchOnce(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}
