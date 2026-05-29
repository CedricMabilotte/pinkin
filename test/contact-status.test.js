// test/contact-status.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/services/contact-status.js — contactStatus() et
// statusCounts().
//
// CONTEXTE. Comme vcard-reader, ce module était annoncé « couvert par 7 cas de
// tests » au handoff #3 sans qu'aucun fichier n'ait jamais existé (leçon #4 L6).
// Couverture recréée ici.
//
// SUR LES OBJETS DE TEST. contactStatus ne lit du contact que trois choses :
// hasGeo(), geo et addresses. Deux familles d'objets sont utilisées :
//   - de vrais Contact (core/model/contact.js) construits depuis une réponse
//     Google brute — vérifie l'intégration réelle ;
//   - des objets-mocks {hasGeo, geo, addresses} là où il faut MAÎTRISER la
//     précision du geo (placeRank). Le modèle Contact réduit tout geo à
//     {lat,lng} sans placeRank ; or la précision arrive, dans l'app réelle, par
//     applyGeoCache (cache Nominatim, qui PORTE le placeRank). Le mock reproduit
//     fidèlement CE cas — il n'invente rien que l'app ne produise.
// ─────────────────────────────────────────────────────────────────────────────

// Migration #6 : `node:test` → Vitest. `node:assert` reste compatible — pas de
// réécriture des assertions, seul l'import du runner change. Voir vitest.config.js.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { contactStatus, statusCounts } from '../core/services/contact-status.js';
import { Contact } from '../core/model/contact.js';

// Réponse Google brute minimale, surchargée au besoin.
function rawContact(overrides = {}) {
  return { resourceName: 'people/c1', names: [{ displayName: 'Test' }], ...overrides };
}

// 1 — Contact localisé via un champ GEO Google parsé : sur la carte. Le modèle
//     Contact ne conserve pas de placeRank -> précision INCONNUE -> autorisée
//     à l'écriture (« l'inconnu n'est pas le douteux », cf. vcard-writer.js).
test('contact avec GEO Google -> located, writable (précision inconnue)', () => {
  const c = new Contact(rawContact({
    userDefined: [{ key: 'GEO', value: 'geo:45.7640,4.8357' }],
  }));
  assert.deepEqual(contactStatus(c), { status: 'located', located: true, writable: true });
});

// 2 — Contact localisé mais à précision GROSSIÈRE (placeRank 8 ≈ région) :
//     sur la carte, mais PAS assez précis pour être inscrit dans Google.
test('contact localisé imprécis (placeRank région) -> located, non writable', () => {
  const mock = { hasGeo: () => true, geo: { lat: 45.5, lng: 4.8, placeRank: 8 }, addresses: [] };
  assert.deepEqual(contactStatus(mock), { status: 'located', located: true, writable: false });
});

// 3 — Contact localisé à précision FINE (placeRank 26 ≈ rue) : writable.
test('contact localisé précis (placeRank rue) -> located, writable', () => {
  const mock = { hasGeo: () => true, geo: { lat: 45.5, lng: 4.8, placeRank: 26 }, addresses: [] };
  assert.equal(contactStatus(mock).writable, true);
});

// 4 — Geo numériquement invalide (hors bornes) : la validité prime sur tout —
//     jamais writable, quelle que soit la précision annoncée.
test('contact avec geo hors bornes -> non writable', () => {
  const mock = { hasGeo: () => true, geo: { lat: 999, lng: 4.8, placeRank: 30 }, addresses: [] };
  assert.equal(contactStatus(mock).writable, false);
});

// 5 — Pas de coordonnée mais une adresse renseignée : hors carte, « unresolved »
//     (géocodage échoué ou pas encore passé) — réparable en corrigeant l'adresse.
test('contact sans geo mais avec adresse -> unresolved', () => {
  const c = new Contact(rawContact({
    addresses: [{ formattedValue: '10 rue Inconnue, Nulle-Part' }],
  }));
  assert.deepEqual(contactStatus(c), { status: 'unresolved', located: false, writable: false });
});

// 6 — Ni coordonnée ni adresse : hors carte, « no-address » — réparable en
//     AJOUTANT une adresse. Distinction qui commande deux gestes du Carnet.
test('contact sans geo ni adresse -> no-address', () => {
  const c = new Contact(rawContact());
  assert.deepEqual(contactStatus(c), { status: 'no-address', located: false, writable: false });
});

// 7 — statusCounts agrège une liste hétérogène dans les trois compartiments.
test('statusCounts ventile correctement une liste mixte', () => {
  const located    = { hasGeo: () => true,  geo: { lat: 45, lng: 4 }, addresses: [] };
  const unresolved = { hasGeo: () => false, geo: null, addresses: [{ formattedValue: 'x' }] };
  const noAddress  = { hasGeo: () => false, geo: null, addresses: [] };
  const counts = statusCounts([located, located, unresolved, noAddress, noAddress, noAddress]);
  assert.deepEqual(counts, { located: 2, unresolved: 1, 'no-address': 3 });
});

// 8 — statusCounts sur une liste vide : tous les compteurs à zéro, pas d'erreur.
test('statusCounts sur liste vide -> compteurs à zéro', () => {
  assert.deepEqual(statusCounts([]), { located: 0, unresolved: 0, 'no-address': 0 });
});
