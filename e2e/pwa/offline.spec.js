// e2e/pwa/offline.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Éprouve la promesse offline-first de la PWA, plutôt que de la supposer.
//
// CONTEXTE (revue de durcissement 2026-07-16, AUDIT_DURCISSEMENT.md §1).
// `pwa/service-worker-pwa.js` existait déjà mais n'était jamais enregistré
// nulle part — « offline-first » (BRIEF_PINKIN.md, README) n'avait donc
// aucun effet réel. Corrigé : enregistrement dans `pwa/app.js`, cache
// versionné, mise en cache au fil de l'eau des réponses same-origin. Ce
// test ferme le [SUPPOSÉ] laissé ouvert dans AUDIT_DURCISSEMENT.md §7/§6
// (« éprouver l'offline réel ») en le vérifiant par exécution.
//
// POURQUOI /pwa/ ET PAS '/'. Le service worker est enregistré avec
// `{ scope: '/pwa/' }` (aligné sur `start_url` du manifest — c'est là que
// vit la PWA en production). `pwa/dev-server.js` sert aussi `pwa/index.html`
// à la racine '/' par confort de dev (cf. son en-tête), mais '/' est HORS du
// scope du service worker : un test offline sur '/' ne prouverait rien sur
// le SW. `/pwa/` est le chemin qui reflète fidèlement le comportement prod.
//
// STRATÉGIE. Deux visites en ligne (la 2de laisse le SW, déjà actif, prendre
// le contrôle de la page et peupler son cache runtime avec les requêtes de
// CETTE page), puis coupure réseau + rechargement : sans cache SW
// fonctionnel, ceci échouerait immédiatement (ERR_INTERNET_DISCONNECTED).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

test.describe('PWA — offline après une première visite', () => {
  test('la coquille (écran de connexion) reste utilisable après coupure réseau', async ({ page, context }) => {
    // 1re visite, en ligne : installation + activation du service worker.
    await page.goto('/pwa/');
    await page.waitForLoadState('load');
    await page.evaluate(() => navigator.serviceWorker.ready);

    // 2e visite, toujours en ligne : cette fois la page EST contrôlée par le
    // SW dès la navigation — ses requêtes (JS, CSS, manifest, Leaflet) sont
    // mises en cache au passage par le handler `fetch` « au fil de l'eau ».
    await page.reload();
    await page.waitForLoadState('load');
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    expect(controlled).toBe(true);

    // Coupure réseau, puis rechargement : le test de vérité.
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.locator('#btn-connect')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#state-auth')).toBeVisible();
    } finally {
      // Toujours restaurer le réseau, même si l'assertion ci-dessus a échoué —
      // sinon les tests suivants du run héritent d'un contexte offline.
      await context.setOffline(false);
    }
  });
});
