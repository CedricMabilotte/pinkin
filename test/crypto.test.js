// test/crypto.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/crypto.js — getMasterKey, encrypt, decrypt.
//
// CONTEXTE. Module écarté à tort en session #6 (« couplé navigateur ») :
// Node 22 fournit globalThis.crypto (WebCrypto natif), donc parfaitement
// testable sous Node. Réintroduit Lot 2 #2.
//
// ENJEU. Le chiffrement AES-GCM du jeton OAuth est la dernière barrière entre
// un attaquant ayant accès au stockage navigateur et la session Google. Le
// commentaire en tête du module assume la limite (« obfuscation au repos »),
// mais les invariants à protéger restent forts : aller-retour fidèle,
// non-réutilisation d'IV, clé re-générée proprement si stockage corrompu.
//
// MOCKS. Platform-like en mémoire — getMasterKey reçoit une plateforme par
// argument, on passe le nôtre directement. ZÉRO mock du module crypto.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, test, expect, vi } from 'vitest';
import { getMasterKey, encrypt, decrypt } from '../core/crypto.js';

// Platform minimal (signature get/set/del) en mémoire.
function makePlatform() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async set(key, value) {
      if (value === null) store.delete(key);
      else store.set(key, value);
    },
    async del(key) { store.delete(key); },
    _store: store, // pour les inspections
  };
}

// Réinitialiser le cache mémoire du module ENTRE chaque test : `_cachedKey`
// est une variable de module, donc partagée entre tests s'ils s'exécutent
// dans le même worker. On contourne par un import dynamique avec cache-bust,
// ou plus simplement on assume qu'on teste avec une plateforme neuve à
// chaque fois et que tous les tests sont cohérents avec une même clé.
beforeEach(() => {
  // (rien — voir note ci-dessus)
});

describe('getMasterKey', () => {
  test('première installation : génère une clé et la persiste en JWK', async () => {
    const platform = makePlatform();
    const key = await getMasterKey(platform);
    expect(key).toBeDefined();
    expect(platform._store.has('pinkin_master_key')).toBe(true);
    const stored = platform._store.get('pinkin_master_key');
    // JWK : forme attendue pour AES-GCM 256.
    expect(stored.kty).toBe('oct');
    expect(stored.alg).toBe('A256GCM');
  });

  test('appels ultérieurs : mémorise (cache mémoire), idempotent côté store', async () => {
    const platform = makePlatform();
    await getMasterKey(platform);
    const sizeAfterFirst = platform._store.size;
    await getMasterKey(platform);
    await getMasterKey(platform);
    expect(platform._store.size).toBe(sizeAfterFirst);
  });

  test('clé stockée corrompue : régénère proprement', async () => {
    // Le cache mémoire `_cachedKey` du module est partagé entre tests dans
    // le même worker. On le reset via vi.resetModules() puis on ré-importe —
    // c'est la voie supportée par Vitest (l'astuce `import?cb=...` n'est
    // pas autorisée en imports dynamiques non statiques).
    vi.resetModules();
    const fresh = await import('../core/crypto.js');

    const platform = makePlatform();
    // Stocker une fausse JWK invalide — importKey va rejeter, le module doit
    // tomber sur la branche « clé corrompue » et en regénérer une.
    platform._store.set('pinkin_master_key', { kty: 'invalid', alg: 'X' });

    const key = await fresh.getMasterKey(platform);
    expect(key).toBeDefined();
    // La JWK persistée doit avoir été REMPLACÉE par une valide.
    const stored = platform._store.get('pinkin_master_key');
    expect(stored.kty).toBe('oct');
    expect(stored.alg).toBe('A256GCM');
  });
});

describe('encrypt / decrypt — aller-retour', () => {
  test('chiffre puis déchiffre : la valeur survit exactement', async () => {
    const platform = makePlatform();
    const plaintext = 'mon-token-secret-1234567890';
    const cipher = await encrypt(plaintext, platform);
    expect(cipher).toHaveProperty('iv');
    expect(cipher).toHaveProperty('ciphertext');
    expect(typeof cipher.iv).toBe('string');
    expect(typeof cipher.ciphertext).toBe('string');
    const recovered = await decrypt(cipher, platform);
    expect(recovered).toBe(plaintext);
  });

  test('chiffre deux fois la même valeur : ciphertext DIFFÉRENTS (IV aléatoire)', async () => {
    // Invariant central de AES-GCM : un IV ne doit jamais être réutilisé sous
    // la même clé. Le module utilise crypto.getRandomValues(12 bytes) à chaque
    // chiffrement, ce qui doit produire des ciphertext différents pour la
    // même entrée.
    const platform = makePlatform();
    const c1 = await encrypt('même valeur', platform);
    const c2 = await encrypt('même valeur', platform);
    expect(c1.iv).not.toBe(c2.iv);
    expect(c1.ciphertext).not.toBe(c2.ciphertext);
    // Les deux se déchiffrent bien vers la même valeur originale.
    expect(await decrypt(c1, platform)).toBe('même valeur');
    expect(await decrypt(c2, platform)).toBe('même valeur');
  });

  test('chaînes vides et Unicode supportées', async () => {
    const platform = makePlatform();
    expect(await decrypt(await encrypt('', platform), platform)).toBe('');
    const unicode = '🔐 ya29.très-long-token-éà€';
    expect(await decrypt(await encrypt(unicode, platform), platform)).toBe(unicode);
  });

  test('ciphertext altéré : déchiffrement REJETÉ (intégrité GCM)', async () => {
    const platform = makePlatform();
    const cipher = await encrypt('secret', platform);
    // Modifier UN caractère du ciphertext base64 — GCM doit refuser.
    const tampered = {
      iv: cipher.iv,
      ciphertext: cipher.ciphertext.slice(0, -2) + (cipher.ciphertext.endsWith('A') ? 'B' : 'A') + '=',
    };
    await expect(decrypt(tampered, platform)).rejects.toThrow();
  });
});
