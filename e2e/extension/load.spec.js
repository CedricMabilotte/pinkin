// e2e/extension/load.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Test E2E — extension MV3 chargée non empaquetée.
//
// ÉTAT (Lot 7 #7). Sentinel — la mécanique est posée mais l'environnement
// d'exécution doit être complet pour tourner :
//   - un display X accessible (DISPLAY défini ET autorisations OK), ou
//   - xvfb-run (apt install xvfb) côté local, ou
//   - le runner GitHub Actions où xvfb est dispo par défaut.
//
// ACTIVATION. Le project 'extension' est sélectif (testMatch sur ce dossier).
// Pour le lancer :
//   PINKIN_EXT=1 npx playwright test --project extension
// Sinon les tests ci-dessous auto-skip — pas de faux échec en local.
//
// PORTÉE PRÉVUE (à activer en #8 ou plus tard).
//   - Charger pinkin/ via --load-extension, cliquer l'icône, vérifier que
//     l'app s'ouvre dans un onglet, écran d'accueil monté, console muette.
//   - Avec storageState (task #10) : carnet, fiche, opt-in écriture.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/../..';
const READY = !!process.env.PINKIN_EXT;

test.describe('Extension MV3 — chargement non empaqueté', () => {
  test.skip(!READY, 'PINKIN_EXT non posé : sentinel inactif — voir tête de fichier');

  test('charge l\'extension et expose son service worker', async () => {
    // Pattern Playwright pour MV3 : launchPersistentContext + flags d'extension.
    // NOTE INVESTIGATION (#7 fin). channel:'chrome' ne fait pas remonter le
    // service worker MV3 à Playwright (waitForEvent timeout). Bascule sur
    // chromium téléchargé qui a les hooks natifs Playwright. Headless: 'new'
    // (Chrome 109+) supporte les extensions MV3.
    const userDataDir = path.join(PROJECT_ROOT, 'test-results', 'ext-profile-' + Date.now());
    const ctx = await chromium.launchPersistentContext(userDataDir, {
      // Pas de channel:'chrome' ici — on prend le chromium bundle Playwright
      // qui expose les service workers via la CDP. Le Chrome stable les masque.
      headless: false,                  // MV3 demande UI graphique
      args: [
        `--disable-extensions-except=${PROJECT_ROOT}`,
        `--load-extension=${PROJECT_ROOT}`,
      ],
    });

    try {
      // Le service worker de l'extension doit apparaître dans les workers du
      // contexte. Timeout généreux (20s) — le SW MV3 en mode module peut
      // prendre du temps à s'enregistrer au premier lancement d'un profil.
      let [worker] = ctx.serviceWorkers();
      if (!worker) {
        worker = await ctx.waitForEvent('serviceworker', { timeout: 20_000 });
      }
      expect(worker.url()).toContain('service-worker.js');

      // L'ID de l'extension (dérivé du key du manifeste) est connu — figé.
      expect(worker.url()).toContain('pnobmjminhgbbgpbogljljojaojiapdp');
    } finally {
      await ctx.close();
    }
  });
});
