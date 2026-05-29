// core/crypto.js
// Chiffrement AES-GCM via WebCrypto API (natif navigateur + Service Worker MV3).
//
// LIMITE ASSUMÉE — à ne pas surévaluer : la clé maître est persistée
// (chrome.storage / localStorage) dans le MÊME magasin que le jeton chiffré.
// Un attaquant ayant accès à ce stockage dispose des deux — le chiffrement est
// donc une obfuscation au repos, pas une garantie forte. Sans backend, il n'y a
// pas de meilleure option ; ce commentaire évite une fausse impression de sûreté.
// Clé liée au navigateur — re-auth si changement de machine.

const ALGO = { name: 'AES-GCM', length: 256 };
const KEY_STORE = 'pinkin_master_key';

// Cache mémoire de la clé — évite de la lire/importer à chaque opération
let _cachedKey = null;

/**
 * Génère ou récupère la clé maître de l'installation.
 * Première installation : génère une clé AES-256 aléatoire, la persiste en JWK.
 * Ouvertures suivantes : importe la clé stockée.
 */
export async function getMasterKey(platform) {
  if (_cachedKey) return _cachedKey;

  const stored = await platform.get(KEY_STORE);

  if (stored) {
    try {
      // extractable: false — la clé ne peut plus être exportée après import (défense en profondeur)
      _cachedKey = await crypto.subtle.importKey(
        'jwk', stored, ALGO, false, ['encrypt', 'decrypt']
      );
      return _cachedKey;
    } catch {
      // Clé maître corrompue -> on régénère ci-dessous. Les jetons chiffrés
      // avec l'ancienne deviennent illisibles : l'app retombe proprement sur
      // une ré-authentification, plutôt que de rester bloquée.
    }
  }

  // Première installation : générer et persister
  const key = await crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await platform.set(KEY_STORE, exported);

  // Ré-importer en non-extractable pour le cache
  _cachedKey = await crypto.subtle.importKey(
    'jwk', exported, ALGO, false, ['encrypt', 'decrypt']
  );
  return _cachedKey;
}

/**
 * Chiffre une chaîne de caractères.
 * Retourne { iv, ciphertext } encodés en base64 — l'IV n'est pas un secret.
 */
export async function encrypt(plaintext, platform) {
  const key = await getMasterKey(platform);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits — standard GCM
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  };
}

/**
 * Déchiffre { iv, ciphertext } et retourne la chaîne originale.
 */
export async function decrypt({ iv, ciphertext }, platform) {
  const key = await getMasterKey(platform);
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(plainBuffer);
}
