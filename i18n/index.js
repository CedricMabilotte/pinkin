// i18n/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Internationalisation Pinkin — bootstrap.
//
// POURQUOI. Décision opérateur (R3 session #7) : multilingue fr/en/es à
// préparer avant V1, parce que .org + Chrome Web Store visent une audience
// internationale. Ce module pose l'INFRASTRUCTURE ; la traduction réelle
// (en.js, es.js) est un effort suivant — pour l'instant ils renvoient les
// mêmes valeurs que fr.js via le fallback.
//
// API.
//   import { t, setLang, getLang } from '../i18n/index.js';
//   t('header.sync.title')         -> "Mettre à jour les contacts…"
//   t('foo.bar', 'fallback')       -> "fallback" si clé absente
//   setLang('en')                  -> change la langue active
//   getLang()                      -> langue active ('fr' | 'en' | 'es')
//
// DÉTECTION. À l'import, on essaie navigator.language ; si elle commence par
// 'en' ou 'es', on prend la langue correspondante. Tout le reste -> 'fr'.
//
// FALLBACK. Une clé absente dans la langue active retombe sur 'fr' puis sur
// le fallback fourni à t() — jamais une chaîne vide ou la clé brute affichées.
// ─────────────────────────────────────────────────────────────────────────────

import fr from './fr.js';
import en from './en.js';
import es from './es.js';

const LANGS = { fr, en, es };

const STORAGE_KEY = 'pinkin_user_lang';

function detectLang() {
  // 1. Choix explicite de l'utilisateur (mémorisé via setLang).
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in LANGS) return saved;
    } catch (_) { /* localStorage indisponible */ }
  }
  // 2. Préférence navigateur — fallback.
  if (typeof navigator === 'undefined' || !navigator.language) return 'fr';
  const code = navigator.language.slice(0, 2).toLowerCase();
  return code in LANGS ? code : 'fr';
}

let _lang = detectLang();

export function getLang() {
  return _lang;
}

export function setLang(lang) {
  if (lang in LANGS) {
    _lang = lang;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    }
  }
}

/**
 * Lit une chaîne traduite par chemin pointé (« header.sync.title »).
 * Fallback en cascade : langue active -> fr -> fallback explicite -> clé brute.
 *
 * Second argument :
 *   - string  : fallback explicite si la clé est absente partout
 *   - object  : paramètres d'interpolation (mustache simple « {nom} »)
 *
 * Exemples :
 *   t('carnet.capMessage', { extras: 5 })  // « … et 5 autres… »
 *   t('foo.bar', 'défaut')                  // « défaut » si absent
 *   t('foo.bar')                            // « foo.bar » si absent
 */
export function t(key, paramsOrFallback) {
  const isParams = paramsOrFallback != null && typeof paramsOrFallback === 'object';
  const fallback = isParams ? null : paramsOrFallback;
  const params   = isParams ? paramsOrFallback : null;

  const fromActive = lookup(LANGS[_lang], key);
  const raw = fromActive != null
    ? fromActive
    : (lookup(LANGS.fr, key) ?? (fallback != null ? fallback : key));

  return params ? interpolate(raw, params) : raw;
}

// Interpolation mustache simple : « {nom} » -> params.nom. Un placeholder
// sans correspondance est laissé tel quel (signal visible).
function interpolate(tpl, params) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

function lookup(dict, key) {
  if (!dict) return null;
  const parts = key.split('.');
  let node = dict;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return null;
    node = node[p];
  }
  return typeof node === 'string' ? node : null;
}
