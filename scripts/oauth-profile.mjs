#!/usr/bin/env node
// scripts/oauth-profile.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Capture d'un PROFIL Chromium PERSISTANT loggé à Google — alternative au
// `playwright codegen --save-storage` qui se fait bloquer par la détection
// d'automation Google (« Ce navigateur n'est pas sécurisé »).
//
// POURQUOI UN PROFIL plutôt qu'un storageState ?
//   - `--save-storage` exige codegen qui pose `--enable-automation`. Google
//     refuse l'écran de connexion.
//   - Un profil persistant (launchPersistentContext) garde TOUT (cookies,
//     localStorage, IndexedDB, sessionStorage, service workers) entre runs.
//     Plus complet que storageState et résout le même besoin : ne pas
//     re-OAuth à chaque test.
//   - On désactive explicitement le flag d'automation détecté par Google.
//
// USAGE.
//   node scripts/oauth-profile.mjs
//   -> ouvre une fenêtre Chrome sur http://localhost:3000
//   -> tu fais le flux OAuth Google complet (Connecter Google Contacts)
//   -> attends que tu voies tes contacts chargés dans Pinkin
//   -> ferme la fenêtre (le profil est sauvé automatiquement)
//
// EMPLACEMENT. Le profil vit dans e2e/.auth/profile/ (gitignored).
// Pour repartir d'un profil neuf : `rm -rf e2e/.auth/profile`.
//
// ENSUITE. Les tests E2E « authenticated » utiliseront ce profil via le
// project Playwright `pwa-authenticated` (à câbler dans playwright.config.js
// quand le profil sera prêt). Voir e2e/pwa-auth/ pour les tests futurs.
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const PROFILE_DIR  = path.join(PROJECT_ROOT, 'e2e', '.auth', 'profile');
const BASE_URL     = process.env.PWA_BASE_URL || 'http://localhost:3000';

await mkdir(PROFILE_DIR, { recursive: true });

console.log(`\n→ Profil persistant Chrome : ${PROFILE_DIR}`);
console.log(`→ Ouverture de ${BASE_URL}\n`);

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: 'chrome',          // Chrome système, plus discret que chromium pur
  headless: false,
  viewport: null,             // taille fenêtre OS
  args: [
    // Le flag qui fait dire à Google « ce navigateur n'est pas sécurisé ».
    // Le retirer ne te promet pas le succès — Google peut encore détecter
    // d'autres signaux — mais c'est l'astuce qui marche dans 99 % des cas.
    '--disable-blink-features=AutomationControlled',
  ],
  // Locale fr-FR pour cohérence (Pinkin bascule selon navigator.language).
  locale: 'fr-FR',
  // Ne pas accepter les bannières non sollicitées : on observe l'OAuth vrai.
  ignoreDefaultArgs: ['--enable-automation'],
});

// Petit anti-détection supplémentaire : navigator.webdriver doit être false.
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});

const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(BASE_URL);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  → Une fenêtre Chrome est ouverte sur Pinkin.');
console.log('  → Clique « Connecter Google Contacts » et finis le flux OAuth.');
console.log('  → Quand tu vois la carte (ou le carnet) avec tes contacts,');
console.log('    FERME LA FENÊTRE — le profil sera sauvé automatiquement.');
console.log('  → Ce script attend la fermeture, puis quitte.');
console.log('═══════════════════════════════════════════════════════════════\n');

// Attendre la fermeture explicite de la fenêtre par l'utilisateur.
await new Promise((resolve) => ctx.once('close', resolve));

console.log(`\n✓ Profil sauvé dans ${PROFILE_DIR}`);
console.log('  Tu peux maintenant lancer les tests E2E authenticated.');
