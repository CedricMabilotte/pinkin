// test/geopoint.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/model/geopoint.js — classe GeoPoint.
//
// CONTEXTE. GeoPoint porte une coordonnée et ses métadonnées de géocodage
// (placeRank, confidence). Module pur, ajouté à la couverture en session #5.
// ─────────────────────────────────────────────────────────────────────────────

// Migration #6 : `node:test` → Vitest. `node:assert` reste compatible — pas de
// réécriture des assertions, seul l'import du runner change. Voir vitest.config.js.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { GeoPoint } from '../core/model/geopoint.js';

// ── construction et métadonnées ──────────────────────────────────────────────

test('métadonnées par défaut à null quand absentes', () => {
  const g = new GeoPoint(48.85, 2.35);
  assert.equal(g.displayName, null);
  assert.equal(g.confidence, null);
  assert.equal(g.placeRank, null);
});

test('métadonnées conservées quand fournies', () => {
  const g = new GeoPoint(48.85, 2.35, { displayName: 'Paris', confidence: 0.9, placeRank: 16 });
  assert.equal(g.displayName, 'Paris');
  assert.equal(g.confidence, 0.9);
  assert.equal(g.placeRank, 16);
});

// ── sérialisations ───────────────────────────────────────────────────────────

test('toVCardGeo — format RFC 6350 "geo:lat,lng"', () => {
  assert.equal(new GeoPoint(48.8566, 2.3522).toVCardGeo(), 'geo:48.8566,2.3522');
});

test('toLeaflet — tableau [lat, lng]', () => {
  assert.deepEqual(new GeoPoint(48.85, 2.35).toLeaflet(), [48.85, 2.35]);
});

// ── isValid : type numérique ET bornes géographiques ─────────────────────────

test('isValid vrai pour une coordonnée numérique dans les bornes', () => {
  assert.equal(new GeoPoint(48.85, 2.35).isValid(), true);
  assert.equal(new GeoPoint(-90, 180).isValid(), true);
});

test('isValid faux hors bornes', () => {
  assert.equal(new GeoPoint(91, 2).isValid(), false);
  assert.equal(new GeoPoint(48, 181).isValid(), false);
});

test('isValid faux si lat/lng ne sont pas des nombres', () => {
  assert.equal(new GeoPoint('48.85', '2.35').isValid(), false);
});

// ── fromNominatim : parse la réponse Nominatim (champ "lon", pas "lng") ──────

test('fromNominatim convertit lat/lon en nombres et mappe les métadonnées', () => {
  const g = GeoPoint.fromNominatim({
    lat: '48.8566', lon: '2.3522',
    display_name: 'Paris, France', importance: 0.85, place_rank: 16,
  });
  assert.equal(g.lat, 48.8566);
  assert.equal(g.lng, 2.3522);
  assert.equal(g.displayName, 'Paris, France');
  assert.equal(g.confidence, 0.85);
  assert.equal(g.placeRank, 16);
  assert.equal(g.isValid(), true);
});
