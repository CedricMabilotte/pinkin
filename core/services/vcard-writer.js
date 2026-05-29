// core/services/vcard-writer.js
// ─────────────────────────────────────────────────────────────────────────────
// Écriture du champ GEO dans Google Contacts.
//
// GARDE-FOU DE CONFIANCE. On n'écrit pas dans le carnet PERMANENT de
// l'utilisateur un géocodage trop grossier. Un mauvais pin sur la carte se
// corrige d'un rechargement ; une mauvaise coordonnée écrite dans Google
// Contacts est une pollution durable.
//
// CHOIX DU SIGNAL — et pourquoi PAS « importance ».
// Nominatim renvoie un champ `importance` (0–1), tentant comme « confiance ».
// Mais importance mesure la NOTORIÉTÉ d'un lieu, pas la qualité du résultat :
// une adresse précise de maison a une importance FAIBLE, une grande ville une
// importance forte. On utilise donc `place_rank` : un entier de PRÉCISION
// (≈4 pays, 8 région, 12 département, 14-16 ville, 26 rue, 30 maison).
//
// CALIBRAGE DU SEUIL — révisé après mesure sur un vrai carnet (session #3).
// Un carnet personnel porte surtout des adresses de niveau VILLE, rarement la
// rue. Géocoder « Lyon » au centre de Lyon est FIDÈLE, pas imprécis : une
// localisation utile, qui mérite d'être écrite. Ce qui ne le mérite pas, c'est
// un pin au centre d'un PAYS ou d'une région — du bruit, pas une position. Le
// seuil se place donc à la ville, pas à la rue (un seuil rue écartait 262/263
// contacts d'un carnet réel — la mesure qui a déclenché cette révision).
// ─────────────────────────────────────────────────────────────────────────────

import {
  updateContactGeo, batchUpdateContactsGeo, updateContactAddressAndGeo,
  batchRemoveGeo, fetchAllContacts
} from '../api/google-people.js';
import { GEO_CACHE_KEY, geocodeAddress } from './geocoder.js';
import { Platform } from '../platform.js';

// Précision minimale pour autoriser l'écriture, en place_rank Nominatim.
// 13 laisse passer la ville (≈14-16) et plus fin ; écarte département (≈12),
// région (≈8) et pays (≈4) — trop grossiers pour valoir une coordonnée inscrite
// dans le carnet permanent. Constante de réglage : calibrée sur la distribution
// observée d'un carnet réel (mesure #3).
const MIN_PLACE_RANK = 13;

// Vrai si ce geo est assez précis pour être écrit dans Google Contacts.
// Une précision INCONNUE (geo issu d'un champ GEO préexistant, ou d'un cache
// antérieur à ce garde-fou) n'est pas un échec : on l'autorise. L'inconnu n'est
// pas le douteux.
// Validité numérique d'une coordonnée — NaN ou hors bornes interdits à l'écriture.
function isValidGeo(geo) {
  return !!geo &&
    Number.isFinite(geo.lat) && Number.isFinite(geo.lng) &&
    geo.lat >= -90 && geo.lat <= 90 && geo.lng >= -180 && geo.lng <= 180;
}

export function isConfidentEnough(geo) {
  // Validité d'abord : on n'écrit jamais une coordonnée NaN ou hors bornes dans
  // le carnet Google, quel que soit le place_rank.
  if (!isValidGeo(geo)) return false;
  return geo.placeRank == null || geo.placeRank >= MIN_PLACE_RANK;
}

// Écrit la géolocalisation d'UN contact dans son champ GEO Google.
// Retourne { written: bool, reason? }.
// Le token obtenu doit déjà porter le scope écriture (contacts) : c'est le flux
// opt-in qui le garantit en amont.
export async function writeGeoToContact(contact, geo) {
  if (!isConfidentEnough(geo)) {
    return { written: false, reason: 'LOW_CONFIDENCE' };
  }
  const token = await Platform.auth.getAccessToken();
  await updateContactGeo(token, contact.resourceName, geo);
  return { written: true };
}

// Publication GROUPÉE : écrit dans Google Contacts tout le cache de géocodage.
// Appelée une fois, à l'octroi du scope écriture (décision D1 : « bulk à
// l'octroi du scope »). Le cache géo (pinkin_geo_cache) contient les contacts
// localisés par Nominatim ; on les écrit en lot via batchUpdateContactsGeo, en
// écartant au passage ceux dont la localisation est trop imprécise.
//
// token : doit porter le scope écriture.
// Retour : { written, skipped, failed } — pour le retour à l'utilisateur.
export async function publishGeoCache(token) {
  const cache = await Platform.get(GEO_CACHE_KEY) ?? {};

  // Le cache mêle deux formes : des coordonnées, et des enregistrements d'échec
  // de géocodage { failed:true }. Seules les coordonnées concernent la
  // publication. On écarte les échecs AVANT tout décompte : un contact jamais
  // localisé n'a pas été « ignoré à l'écriture », il n'a jamais été candidat —
  // l'inclure dans `skipped` ferait mentir le bilan sur sa propre cause.
  const located = Object.entries(cache)
    .map(([resourceName, geo]) => ({ resourceName, geo }))
    .filter(e => isValidGeo(e.geo));

  // Garde-fou de confiance appliqué aux seuls contacts localisés. `skipped` ne
  // compte donc QUE des localisations trop imprécises — le « localisation
  // imprécise » annoncé à l'utilisateur est alors exact.
  const toWrite = located.filter(e => isConfidentEnough(e.geo));
  const skipped = located.length - toWrite.length;

  if (!toWrite.length) return { written: 0, skipped, failed: 0 };

  const { written, failed } = await batchUpdateContactsGeo(token, toWrite);
  return { written, skipped, failed };
}

// Corrige l'adresse d'UN contact, à l'initiative de l'utilisateur (action de la
// fiche contact). Reçoit une adresse STRUCTURÉE { streetAddress?, postalCode?,
// city?, region?, country? }, la géocode, écrit l'adresse corrigée + la nouvelle
// géoloc dans Google, met à jour le cache géo local. Retourne le nouveau GeoPoint.
//
// Pas de garde-fou de confiance ici : l'utilisateur a saisi et validé l'adresse
// lui-même — l'écrire est son intention explicite, même si Nominatim reste vague.
export async function correctContactAddress(contact, address) {
  // Requête de géocodage construite depuis les champs structurés. Une requête
  // structurée se résout nettement mieux qu'une chaîne agglutinée — c'est
  // l'autre bénéfice, moins visible, du formulaire structuré.
  const query = [
    address.streetAddress, address.city, address.region,
    address.postalCode, address.country
  ].filter(Boolean).join(', ');

  const geo = await geocodeAddress(query);
  // Validité requise même pour une correction explicite : pas de NaN dans Google.
  if (!isValidGeo(geo)) throw new Error('GEOCODE_FAILED');

  const token = await Platform.auth.getAccessToken();
  await updateContactAddressAndGeo(token, contact.resourceName, address, geo);

  // Refléter la nouvelle géoloc dans le cache local (source de la carte).
  const cache = await Platform.get(GEO_CACHE_KEY) ?? {};
  cache[contact.resourceName] = geo;
  await Platform.set(GEO_CACHE_KEY, cache);

  return geo;
}

// Réversibilité : retire de Google Contacts TOUTES les géolocalisations que
// Pinkin y a écrites. Scanne l'ensemble des contacts, cible ceux qui portent un
// champ userDefined GEO, et le retire en lot. Retourne { cleared, failed }.
// Ne touche pas au drapeau de publication : l'appelant en décide.
export async function removeAllGeoFields(token) {
  const raw = await fetchAllContacts(token);
  const targets = raw
    .filter(p => (p.userDefined ?? []).some(f => f.key === 'GEO'))  // 'GEO' : convention Pinkin
    .map(p => p.resourceName);
  if (!targets.length) return { cleared: 0, failed: 0 };
  return batchRemoveGeo(token, targets);
}
