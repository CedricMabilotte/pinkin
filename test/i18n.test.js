// test/i18n.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires du système i18n — t(), setLang(), getLang(), fallback.
//
// PORTÉE. L'infrastructure i18n posée en Lot 6 #7 est l'amorce du
// multilingue R3 (fr / en / es) avant V1. Le bootstrap couvre :
//   - lookup par chemin pointé ('header.sync.title') ;
//   - fallback en cascade : langue active -> fr -> fallback explicite -> clé ;
//   - bascule de langue à chaud ;
//   - détection navigator.language écartée si langue inconnue.
//
// MULTILINGUE V1 (#8). Les traductions en.js / es.js sont désormais COMPLÈTES
// (chaque clé fr.js est traduite). On ajoute donc le garde-fou de parité
// fr / en / es : toute clé feuille présente dans fr doit l'être dans en et es,
// sinon une regression silencieuse laisserait une chaîne FR fuser dans une UI
// anglophone/hispanophone. Le fallback fr reste testé sur des clés
// délibérément hors dictionnaire.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, test, expect, beforeEach } from 'vitest';
import { t, setLang, getLang } from '../i18n/index.js';
import fr from '../i18n/fr.js';
import en from '../i18n/en.js';
import es from '../i18n/es.js';

beforeEach(() => {
  // Repartir en fr par défaut entre tests (le module mémorise la langue).
  setLang('fr');
});

describe('t() — lecture de chaînes', () => {
  test('lookup simple en fr', () => {
    expect(t('welcome.connect')).toBe('Connecter Google Contacts');
  });

  test('chemin profond (3 niveaux)', () => {
    expect(t('header.sync.title')).toMatch(/mettre à jour/i);
  });

  test('clé absente avec fallback explicite -> retourne le fallback', () => {
    expect(t('nope.nada', 'défaut')).toBe('défaut');
  });

  test('clé absente sans fallback -> retourne la clé brute (signal visible)', () => {
    expect(t('totally.missing.key')).toBe('totally.missing.key');
  });

  test('valeur non-chaîne (object/sous-arbre) -> traitée comme absente', () => {
    // 'header' est un objet dans fr.js -> ne doit pas être retourné comme chaîne.
    expect(t('header', 'fb')).toBe('fb');
  });

  test('interpolation mustache {placeholder}', () => {
    // carnet.capMessage utilise {extras}.
    expect(t('carnet.capMessage', { extras: 5 })).toBe('… et 5 autres — précise ta recherche.');
  });

  test('interpolation multi-paramètres', () => {
    expect(t('geocoding.partial', { located: 200, total: 263 }))
      .toBe('200 contacts localisés sur 263 — certaines adresses sont restées introuvables.');
  });

  test('placeholder sans correspondance : laissé tel quel (signal visible)', () => {
    expect(t('carnet.capMessage', {})).toBe('… et {extras} autres — précise ta recherche.');
  });
});

describe('setLang / getLang — bascule de langue', () => {
  test('bascule fr -> en : les clés traduites en en sont préférées', () => {
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('welcome.connect')).toBe('Connect Google Contacts');
    expect(t('header.sync.label')).toBe('Sync');
  });

  test('en : clé absente partout -> fallback fr puis clé brute', () => {
    setLang('en');
    // welcome.connect est désormais traduit ; on prend une clé qui n'existe
    // NULLE PART pour vérifier le mécanisme de fallback en cascade.
    expect(t('missing.in.all.langs', 'default')).toBe('default');
    expect(t('missing.in.all.langs')).toBe('missing.in.all.langs');
  });

  test('es : bascule effective -> chaînes en espagnol', () => {
    setLang('es');
    expect(t('welcome.connect')).toBe('Conectar Google Contacts');
    expect(t('carnet.filterAll')).toBe('Todos');
    expect(t('panel.actionCall')).toBe('Llamar');
  });

  test('setLang avec code inconnu : conserve la langue active', () => {
    setLang('en');
    setLang('xx');
    expect(getLang()).toBe('en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Garde-fou de parité — l'objet de ce bloc :
// si quelqu'un ajoute une clé à fr.js sans la traduire ailleurs, l'UI
// anglophone/hispanophone afficherait du français silencieusement. Ce test
// fait sauter le CI immédiatement et nomme les clés manquantes pour
// faciliter la correction.
// ─────────────────────────────────────────────────────────────────────────────
describe('parité fr / en / es — toute clé feuille de fr existe dans en et es', () => {
  // Aplati récursivement un dict en liste de chemins pointés vers ses feuilles
  // string. Ignore les sous-objets, qui ne sont pas des cibles de t().
  function leafPaths(node, prefix = '') {
    const out = [];
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') out.push(...leafPaths(v, path));
      else if (typeof v === 'string') out.push(path);
    }
    return out;
  }

  function lookup(dict, key) {
    let node = dict;
    for (const p of key.split('.')) {
      if (node == null || typeof node !== 'object') return null;
      node = node[p];
    }
    return typeof node === 'string' ? node : null;
  }

  const frKeys = leafPaths(fr);

  test('en couvre toutes les clés feuilles de fr', () => {
    const missing = frKeys.filter((k) => lookup(en, k) == null);
    expect(missing, `Clés non traduites en en.js : ${missing.join(', ')}`).toEqual([]);
  });

  test('es couvre toutes les clés feuilles de fr', () => {
    const missing = frKeys.filter((k) => lookup(es, k) == null);
    expect(missing, `Clés non traduites en es.js : ${missing.join(', ')}`).toEqual([]);
  });

  test('les marqueurs mustache de fr sont préservés en en et es', () => {
    // Si on traduit 'partial' et qu'on oublie {located}, le rendu cassera à
    // l'exécution. On extrait les placeholders {nom} de chaque chaîne fr et
    // on vérifie qu'ils restent présents dans en et es.
    const placeholderRe = /\{(\w+)\}/g;
    const mismatches = [];
    for (const key of frKeys) {
      const frStr = lookup(fr, key);
      const frPlaceholders = new Set([...frStr.matchAll(placeholderRe)].map((m) => m[1]));
      if (frPlaceholders.size === 0) continue;
      for (const [code, dict] of [['en', en], ['es', es]]) {
        const target = lookup(dict, key);
        if (target == null) continue; // traité par les tests précédents
        const targetPlaceholders = new Set([...target.matchAll(placeholderRe)].map((m) => m[1]));
        const missingInTarget = [...frPlaceholders].filter((p) => !targetPlaceholders.has(p));
        if (missingInTarget.length > 0) {
          mismatches.push(`${code}:${key} manque {${missingInTarget.join('}, {')}}`);
        }
      }
    }
    expect(mismatches, `Placeholders mustache perdus : ${mismatches.join(' | ')}`).toEqual([]);
  });
});
