// test/vcard-reader.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/services/vcard-reader.js — parseVCardAddress().
//
// CONTEXTE. Le handoff #3 affirmait ce module « couvert par 6 cas de tests
// unitaires » ; aucun fichier de test n'a jamais existé dans l'arbre ni dans
// l'historique git (leçon #4 L6). Ce fichier recrée cette couverture, pour de
// bon cette fois — sur le module tel qu'il est aujourd'hui dans l'arbre.
//
// OUTILLAGE. node:test (runner intégré, Node ≥ 18) — zéro dépendance, cohérent
// avec l'invariant « tout gratuit, zéro friction d'installation ». Lancement :
// `npm test` (script ajouté à package.json) ou `node --test`.
//
// parseVCardAddress(text) extrait UNIQUEMENT l'adresse postale (champ ADR,
// RFC 6350) du premier ADR rencontré. Composants ADR, ordre figé :
//   0 boîte postale · 1 complément · 2 rue · 3 ville · 4 région ·
//   5 code postal · 6 pays.
// La rue retournée agrège les composants 0+1+2 non vides, joints par ', '.
// ─────────────────────────────────────────────────────────────────────────────

// Migration #6 : `node:test` → Vitest. `node:assert` reste compatible — pas de
// réécriture des assertions, seul l'import du runner change. Voir vitest.config.js.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseVCardAddress } from '../core/services/vcard-reader.js';

// 1 — Entrée non exploitable : ni chaîne, ou chaîne vide -> null (pas d'exception).
test('entrée invalide ou vide retourne null', () => {
  assert.equal(parseVCardAddress(null), null);
  assert.equal(parseVCardAddress(undefined), null);
  assert.equal(parseVCardAddress(42), null);
  assert.equal(parseVCardAddress(''), null);
  assert.equal(parseVCardAddress('   \n  '), null);
});

// 2 — vCard 3.0 complète : les sept composants ADR sont tous extraits.
test('ADR complet — tous les champs extraits', () => {
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Jean Test',
    'ADR;TYPE=HOME:;;12 rue des Lilas;Lyon;Rhône;69003;France',
    'END:VCARD',
  ].join('\r\n');
  assert.deepEqual(parseVCardAddress(vcf), {
    streetAddress: '12 rue des Lilas',
    city:          'Lyon',
    region:        'Rhône',
    postalCode:    '69003',
    country:       'France',
  });
});

// 3 — Préfixe de groupe Apple « item1.ADR » : la propriété reste reconnue.
test('préfixe de groupe Apple item1.ADR reconnu', () => {
  const vcf = 'BEGIN:VCARD\nitem1.ADR;type=HOME:;;5 Main St;Springfield;;62704;USA\nEND:VCARD';
  assert.deepEqual(parseVCardAddress(vcf), {
    streetAddress: '5 Main St',
    city:          'Springfield',
    postalCode:    '62704',
    country:       'USA',
  });
});

// 4 — Repli de ligne RFC 6350 §3.2 : une ligne débutant par une espace prolonge
//     la précédente, SANS insérer d'espace (l'espace de pliage est retiré).
test('repli de ligne (line folding) recollé', () => {
  const vcf = 'BEGIN:VCARD\nADR:;;100 Avenue ABC\n DEF;Paris;;75001;France\nEND:VCARD';
  assert.deepEqual(parseVCardAddress(vcf), {
    streetAddress: '100 Avenue ABCDEF',
    city:          'Paris',
    postalCode:    '75001',
    country:       'France',
  });
});

// 5 — Caractères échappés RFC 6350 : \, \; \n sont restaurés dans la valeur,
//     et un ';' échappé ne coupe PAS la valeur en deux composants.
test('séparateurs échappés restaurés et non découpés', () => {
  const vcf = 'BEGIN:VCARD\nADR:;;1\\, rue de la Paix\\; Bât B;Paris;;75002;France\nEND:VCARD';
  const r = parseVCardAddress(vcf);
  assert.equal(r.streetAddress, '1, rue de la Paix; Bât B');
  assert.equal(r.city, 'Paris');
});

// 6 — Adresse partielle : seuls les composants non vides apparaissent.
test('ADR partiel — seuls les champs renseignés sont présents', () => {
  const vcf = 'BEGIN:VCARD\nADR;TYPE=WORK:;;;Marseille;;;\nEND:VCARD';
  const r = parseVCardAddress(vcf);
  assert.deepEqual(r, { city: 'Marseille' });
  assert.ok(!('streetAddress' in r));
  assert.ok(!('postalCode' in r));
});

// 7 — ADR présent mais entièrement vide -> null (rien d'exploitable).
test('ADR entièrement vide retourne null', () => {
  const vcf = 'BEGIN:VCARD\nADR;TYPE=HOME:;;;;;;\nEND:VCARD';
  assert.equal(parseVCardAddress(vcf), null);
});

// 8 — Aucune ligne ADR dans la carte -> null.
test('vCard sans champ ADR retourne null', () => {
  const vcf = 'BEGIN:VCARD\nVERSION:4.0\nFN:Sans Adresse\nTEL:+33600000000\nEND:VCARD';
  assert.equal(parseVCardAddress(vcf), null);
});

// 9 — Plusieurs ADR : c'est le PREMIER rencontré qui est retenu.
test('premier ADR retenu quand il y en a plusieurs', () => {
  const vcf = [
    'BEGIN:VCARD',
    'ADR;TYPE=HOME:;;1 First St;CityOne;;11111;France',
    'ADR;TYPE=WORK:;;2 Second St;CityTwo;;22222;France',
    'END:VCARD',
  ].join('\n');
  assert.equal(parseVCardAddress(vcf).city, 'CityOne');
});
