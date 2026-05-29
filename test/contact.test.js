// test/contact.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/model/contact.js — classe Contact.
//
// CONTEXTE. Contact est le modèle de données central : il parse la réponse
// brute de Google People API et centralise la lecture du champ GEO (RFC 6350).
// Couverture ajoutée en session #5 — barre de qualité V0.2. Aucun réseau,
// aucune dépendance navigateur : module pur, testable tel quel sous Node.
// ─────────────────────────────────────────────────────────────────────────────

// Migration #6 : `node:test` → Vitest. `node:assert` reste compatible — pas de
// réécriture des assertions, seul l'import du runner change. Voir vitest.config.js.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { Contact } from '../core/model/contact.js';

// ── displayName : libellé Google, rogné, avec repli ──────────────────────────

test('displayName lu depuis names[0], espaces rognés', () => {
  const c = new Contact({ names: [{ displayName: '  Jean Test  ' }] });
  assert.equal(c.displayName, 'Jean Test');
});

test('displayName absent ou vide -> repli "(sans nom)"', () => {
  assert.equal(new Contact({}).displayName, '(sans nom)');
  assert.equal(new Contact({ names: [] }).displayName, '(sans nom)');
  assert.equal(new Contact({ names: [{ displayName: '   ' }] }).displayName, '(sans nom)');
});

// ── photo : seule une URL https est retenue (garde-fou injection src) ────────

test('photo https acceptée, tout autre schéma rejeté', () => {
  assert.equal(new Contact({ photos: [{ url: 'https://x/p.jpg' }] }).photo, 'https://x/p.jpg');
  assert.equal(new Contact({ photos: [{ url: 'http://x/p.jpg' }] }).photo, null);
  assert.equal(new Contact({ photos: [{ url: 'javascript:alert(1)' }] }).photo, null);
  assert.equal(new Contact({}).photo, null);
});

// ── collections : défaut tableau vide quand le champ manque ──────────────────

test('emails / phones / addresses par défaut à []', () => {
  const c = new Contact({});
  assert.deepEqual(c.emails, []);
  assert.deepEqual(c.phones, []);
  assert.deepEqual(c.addresses, []);
});

// ── _parseGeo / hasGeo : lecture du champ GEO RFC 6350 ───────────────────────

test('champ GEO valide -> geo {lat,lng}, hasGeo() vrai', () => {
  const c = new Contact({ userDefined: [{ key: 'GEO', value: 'geo:48.8566,2.3522' }] });
  assert.deepEqual(c.geo, { lat: 48.8566, lng: 2.3522 });
  assert.equal(c.hasGeo(), true);
});

test('pas de champ GEO -> geo null, hasGeo() faux', () => {
  const c = new Contact({ userDefined: [{ key: 'AUTRE', value: 'x' }] });
  assert.equal(c.geo, null);
  assert.equal(c.hasGeo(), false);
});

test('champ GEO malformé ou hors bornes -> geo null', () => {
  // Valeur sans préfixe geo: reconnaissable -> rejetée.
  assert.equal(new Contact({ userDefined: [{ key: 'GEO', value: 'pas une position' }] }).geo, null);
  // Coordonnée hors bornes (latitude > 90) -> rejetée : pas de marqueur fantôme.
  assert.equal(new Contact({ userDefined: [{ key: 'GEO', value: 'geo:999,2.35' }] }).geo, null);
  // Entrée GEO sans valeur -> rejetée.
  assert.equal(new Contact({ userDefined: [{ key: 'GEO', value: '' }] }).geo, null);
});

// ── needsGeocoding : a une adresse mais pas (encore) de coordonnée ───────────

test('needsGeocoding vrai seulement si adresse présente et pas de geo', () => {
  const avecAdresse = new Contact({ addresses: [{ formattedValue: '1 rue X' }] });
  assert.equal(avecAdresse.needsGeocoding(), true);

  const localise = new Contact({
    addresses: [{ formattedValue: '1 rue X' }],
    userDefined: [{ key: 'GEO', value: 'geo:48.85,2.35' }],
  });
  assert.equal(localise.needsGeocoding(), false);

  const sansAdresse = new Contact({});
  assert.equal(sansAdresse.needsGeocoding(), false);
});

// ── getInitials : repli avatar, 2 lettres maximum ────────────────────────────

test('getInitials — deux mots, un mot, plus de deux mots', () => {
  assert.equal(new Contact({ names: [{ displayName: 'Jean Test' }] }).getInitials(), 'JT');
  assert.equal(new Contact({ names: [{ displayName: 'Jean' }] }).getInitials(), 'J');
  assert.equal(new Contact({ names: [{ displayName: 'Jean Pierre Martin' }] }).getInitials(), 'JP');
});

test('getInitials — contact sans nom -> "?"', () => {
  assert.equal(new Contact({}).getInitials(), '?');
});

// ── passages directs ─────────────────────────────────────────────────────────

test('resourceName et etag transmis tels quels', () => {
  const c = new Contact({ resourceName: 'people/c42', etag: 'abc123' });
  assert.equal(c.resourceName, 'people/c42');
  assert.equal(c.etag, 'abc123');
});
