// core/services/contacts-sync.js
// Orchestration sync Google Contacts → cache local
// Stratégie : Google = source de vérité, local = cache avec TTL
// En cas d'erreur réseau, retourne le cache expiré plutôt que rien

import { Contact } from '../model/contact.js';
import { fetchAllContacts } from '../api/google-people.js';
import { Platform } from '../platform.js';

const CACHE_KEY = 'pinkin_contacts_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Retourne les contacts depuis le cache si frais, sinon fetch Google.
 * @param {object} auth - Objet auth injecté (ExtensionAuth ou PWAAuth)
 */
export async function syncContacts(auth) {
  const cached = await Platform.get(CACHE_KEY);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.contacts.map(raw => new Contact(raw));
  }

  let token;
  try {
    token = await auth.getAccessToken();
  } catch (e) {
    // Pas de réseau ou token invalide → cache expiré en fallback
    if (cached) return cached.contacts.map(raw => new Contact(raw));
    throw e;
  }

  const rawContacts = await fetchAllContacts(token);

  await Platform.set(CACHE_KEY, {
    contacts: rawContacts,
    timestamp: Date.now()
  });

  return rawContacts.map(raw => new Contact(raw));
}

/**
 * Force le rechargement au prochain appel de syncContacts.
 * Appelé par le bouton "Synchroniser" dans le header.
 */
export async function clearCache() {
  await Platform.set(CACHE_KEY, null);
}
