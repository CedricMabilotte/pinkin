// e2e/pwa-auth/carnet-fiche.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// E2E PWA authentifié — TOUT en un fichier (smoke + Carnet + Fiche + P3 + P4).
//
// UN SEUL FICHIER. launchPersistentContext refuse l'ouverture concurrente
// du même userDataDir. Si on splittait en plusieurs spec, Playwright
// lancerait 2 workers, le second planterait sur ProcessSingleton. Tout
// vit donc dans CE fichier, un context partagé via beforeAll/afterAll.
//
// PORTÉE.
//   - Smoke : on entre dans l'app sans repasser par l'écran d'accueil
//     (la session OAuth tient).
//   - Boutons d'en-tête activés après auth.
//   - Popover write s'ouvre au clic, se referme au re-clic.
//   - Bascule Carte ↔ Carnet via les onglets.
//   - Carnet : ≥ 1 ligne rendue, recherche fonctionnelle.
//   - Fiche : ouverture au clic depuis le Carnet, fermeture (croix + Échap).
//   - P4 focus trap : Tab cycle dans la fiche sans en sortir.
//   - P3 déconnexion : popover s'ouvre, Annuler ferme proprement SANS
//     toucher au profil. (Confirmer est volontairement non testé —
//     révoquerait le token Google et invaliderait le profil OAuth.)
//
// CRITÈRE B. Ces scénarios prouvent que la chaîne complète Pinkin marche
// avec un vrai compte Google : sync People API, applyGeoCache, rendu Carnet,
// rendu Fiche, popover P3. Couvre tests A2-A8, B9-B11, G20, G22 de
// TEST_V0.2.md sans intervention humaine après le setup OAuth initial.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, chromium } from '@playwright/test';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/../..';
const PROFILE_DIR  = path.join(PROJECT_ROOT, 'e2e', '.auth', 'profile');
const READY        = existsSync(path.join(PROFILE_DIR, 'Default'));

function clearSingletonLocks() {
  for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { rmSync(path.join(PROFILE_DIR, name), { force: true }); } catch {}
  }
}

test.describe('PWA authentifiée', () => {
  test.skip(!READY, 'Profil e2e/.auth/profile absent — lance `npm run oauth:capture`');

  let ctx, page;

  test.beforeAll(async () => {
    clearSingletonLocks();
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',
      headless: true,
      locale: 'fr-FR',
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    page = ctx.pages()[0] || await ctx.newPage();
    await page.goto('http://localhost:3000/');
    // Attendre que l'orchestrator soit sorti de l'écran auth (session OK).
    await page.waitForFunction(() => {
      const el = document.getElementById('state-auth');
      return el && el.classList.contains('hidden');
    }, { timeout: 8_000 });
  });

  test.afterAll(async () => {
    await ctx?.close();
  });

  // ── Smoke (ex-smoke.spec.js, fusionné Lot fin #7) ───────────────────────

  test('smoke : on est dans l\'app, pas sur l\'écran d\'accueil', async () => {
    await expect(page.locator('#state-auth')).toBeHidden();
  });

  test('smoke : boutons d\'en-tête activés après auth', async () => {
    await expect(page.locator('#btn-sync')).toBeEnabled();
    await expect(page.locator('#btn-write')).toBeEnabled();
    await expect(page.locator('#btn-logout')).toBeEnabled();
    await expect(page.locator('#tab-carte')).toBeEnabled();
    await expect(page.locator('#tab-carnet')).toBeEnabled();
  });

  test('smoke : popover write s\'ouvre et se referme', async () => {
    await page.locator('#btn-write').click();
    await expect(page.locator('#write-popover')).toBeVisible();
    await page.locator('#btn-write').click();
    await expect(page.locator('#write-popover')).toBeHidden();
  });

  test('bascule Carte ↔ Carnet via les onglets', async () => {
    // Au démarrage, onglet Carte actif (classe `on`). Cliquer Carnet
    // bascule la classe et révèle #view-carnet.
    await page.locator('#tab-carnet').click();
    await expect(page.locator('#tab-carnet')).toHaveClass(/\bon\b/);
    await expect(page.locator('#view-carnet')).toBeVisible();
    await expect(page.locator('#map')).toBeHidden();

    // Retour Carte.
    await page.locator('#tab-carte').click();
    await expect(page.locator('#tab-carte')).toHaveClass(/\bon\b/);
    await expect(page.locator('#view-carnet')).toBeHidden();
  });

  test('Carnet : au moins une ligne contact rendue', async () => {
    await page.locator('#tab-carnet').click();
    // Attendre au moins une carnet-row : le rendu peut prendre un instant
    // si applyGeoCache est encore en cours.
    await expect(page.locator('.carnet-row').first()).toBeVisible({ timeout: 5_000 });
    const count = await page.locator('.carnet-row').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Carnet : recherche filtre les lignes', async () => {
    await page.locator('#tab-carnet').click();
    await expect(page.locator('.carnet-row').first()).toBeVisible({ timeout: 5_000 });
    const total = await page.locator('.carnet-row').count();

    // Recherche très peu probable de match -> 0 lignes + message.
    const search = page.locator('#carnet-search');
    await search.fill('zzzzzzzzzzunlikelyzzzzzzzz');
    await expect(page.locator('.carnet-empty')).toBeVisible();
    await expect(page.locator('.carnet-row')).toHaveCount(0);

    // Vider la recherche -> total restauré.
    await search.fill('');
    await expect(page.locator('.carnet-row')).toHaveCount(total);
  });

  test('Fiche : ouverture au clic depuis le Carnet', async () => {
    await page.locator('#tab-carnet').click();
    await expect(page.locator('.carnet-row').first()).toBeVisible({ timeout: 5_000 });
    await page.locator('.carnet-row').first().click();
    // contact-panel passe de hidden à visible.
    await expect(page.locator('#contact-panel')).toBeVisible();
    await expect(page.locator('#panel-name')).not.toBeEmpty();

    // Fermeture par la croix.
    await page.locator('#panel-close').click();
    await expect(page.locator('#contact-panel')).toBeHidden();
  });

  test('Fiche : fermeture par touche Échap', async () => {
    await page.locator('#tab-carnet').click();
    await page.locator('.carnet-row').first().click();
    await expect(page.locator('#contact-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#contact-panel')).toBeHidden();
  });

  test('P4 focus trap : Tab reste dans la fiche', async () => {
    await page.locator('#tab-carnet').click();
    await page.locator('.carnet-row').first().click();
    await expect(page.locator('#contact-panel')).toBeVisible();

    // 12 tabs successifs : le focus DOIT rester à l'intérieur de
    // #contact-panel. Pour vérifier, on lit document.activeElement après
    // chaque tab et on s'assure qu'il est un descendant du panel.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const panel = document.getElementById('contact-panel');
        return panel?.contains(document.activeElement);
      });
      expect(inside, `Tab #${i + 1} : focus sorti de #contact-panel`).toBe(true);
    }

    await page.keyboard.press('Escape');
  });

  test('P3 déconnexion popover : Annuler ferme sans rien révoquer', async () => {
    // ATTENTION : on ne clique JAMAIS « Confirmer » — ça révoquerait le
    // token Google et casserait le profil pour les tests suivants. Seul
    // l'Annuler est sûr.
    await page.locator('#btn-logout').click();
    await expect(page.locator('#logout-popover')).toBeVisible();
    await expect(page.locator('#btn-logout-confirm')).toBeVisible();
    await page.locator('#btn-logout-cancel').click();
    await expect(page.locator('#logout-popover')).toBeHidden();
    // L'app reste authentifiée : state-auth toujours caché.
    await expect(page.locator('#state-auth')).toBeHidden();
  });
});
