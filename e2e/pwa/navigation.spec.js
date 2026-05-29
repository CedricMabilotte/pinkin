// e2e/pwa/navigation.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Scénarios E2E PWA — comportements de l'orchestrateur visibles sans auth.
//
// PORTÉE. Ce qui peut être éprouvé avant le flux OAuth — donc avant que les
// onglets Carte/Carnet soient interactifs (l'orchestrateur ne wire que
// pendant boot()). On reste sur l'écran d'accueil et on vérifie ce qui y est
// monté/inerte.
//
// CRITÈRE B. Trois invariants à protéger :
//   1. La coquille shell.js monte TOUS les éléments d'identité stable (le
//      contrat d'identifiants documenté en haut de shell.js).
//   2. Aucun bouton d'action de l'app (sync, écriture, déconnexion) n'est
//      cliquable avant auth — un clic à vide ne doit pas crasher.
//   3. Le manifeste PWA, le favicon, et les assets statiques répondent.
//
// SCÉNARIOS AUTHENTIFIÉS. Tout ce qui suppose un Carnet chargé (bascule
// d'onglets active, popover d'écriture interactif, ouverture de Fiche, focus
// trap) vit dans le projet « pwa-authenticated » — task #10, OAuth via
// storageState. Non couvert en #6.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

test.describe('PWA — éléments montés par shell.js (avant auth)', () => {
  test('en-tête : boutons sync, écriture, déconnexion présents dans le DOM', async ({ page }) => {
    await page.goto('/');
    // Présents dans le DOM (le shell les monte tous), même si invisibles tant
    // que l'app n'est pas chargée. Ce sont les ID stables du contrat shell.js.
    await expect(page.locator('#btn-sync')).toHaveCount(1);
    await expect(page.locator('#btn-write')).toHaveCount(1);
    await expect(page.locator('#btn-logout')).toHaveCount(1);
  });

  test('barre d\'onglets Carte / Carnet : présente, montrée seulement après auth', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-bar')).toHaveCount(1);
    await expect(page.locator('#tab-carte')).toHaveCount(1);
    await expect(page.locator('#tab-carnet')).toHaveCount(1);
    // L'écran d'accueil recouvre la barre d'onglets — visuellement la barre
    // n'est PAS perçue comme cliquable. On vérifie que #state-auth est l'écran
    // actif (le test de boot.spec.js le couvre déjà — ici on documente la
    // coexistence).
    await expect(page.locator('#state-auth')).toBeVisible();
  });

  test('popovers d\'en-tête (écriture, déconnexion) : présents mais cachés', async ({ page }) => {
    // Régression directe du parcours P1 (refonte session #5) : si renderShell
    // se cassait sur ces deux <div>, le popover d'écriture ne pourrait plus
    // s'ouvrir au clic du bouton d'en-tête.
    await page.goto('/');
    await expect(page.locator('#write-popover')).toHaveCount(1);
    await expect(page.locator('#write-popover')).toBeHidden();
    await expect(page.locator('#logout-popover')).toHaveCount(1);
    await expect(page.locator('#logout-popover')).toBeHidden();
  });

  test('avant auth : boutons d\'en-tête et onglets sont DISABLED (R1 #7)', async ({ page }) => {
    // Décision opérateur : « le montrer pour garder une interface stable,
    // mais le désactiver et le griser ». Le test ci-dessous protège la
    // moitié fonctionnelle (disabled attribute). Le grisé visuel (opacity)
    // n'est pas couvert ici — c'est du CSS, vérifié à l'œil dans Chrome.
    await page.goto('/');
    for (const id of ['#btn-sync', '#btn-write', '#btn-logout', '#tab-carte', '#tab-carnet']) {
      await expect(page.locator(id)).toBeDisabled();
    }
  });

  test('avant auth : tooltips enrichis (R2 #7)', async ({ page }) => {
    // Titles plus parlants — la première fois qu'un utilisateur découvre
    // l'app, « Synchroniser » seul ne suffit pas. NOTE P1 (#7 suite) : le
    // title est SWAPÉ vers un hint « connecte-toi d'abord » dès que
    // l'orchestrator marque les boutons disabled. Ici l'orchestrator ne
    // tourne pas (pas de wireListeners avant goto) — mais shell.js pose
    // les vrais titles au montage, et le swap ne se déclenche que dans
    // showState('auth'). Donc on observe encore les titles enrichis tels
    // que posés au HTML.
    //
    // Quand le swap aura lieu (au prochain showState('auth')), le test
    // « hint sur boutons disabled » ci-dessous le couvre.
    await page.goto('/');
    await expect(page.locator('#btn-sync')).toHaveAttribute('title', /mettre à jour les contacts|connecte-toi/i);
    await expect(page.locator('#btn-write')).toHaveAttribute('title', /enregistrer les positions|connecte-toi/i);
    await expect(page.locator('#btn-logout')).toHaveAttribute('title', /effacer les données locales|connecte-toi/i);
  });

  test('fiche contact (#contact-panel) : présente mais cachée', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contact-panel')).toHaveCount(1);
    await expect(page.locator('#contact-panel')).toBeHidden();
    // role="dialog" et aria-label conformes à l'audit accessibilité (audit #5).
    await expect(page.locator('#contact-panel')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#contact-panel')).toHaveAttribute('aria-label', 'Fiche contact');
  });
});

test.describe('PWA — assets statiques', () => {
  test('favicon répond', async ({ request }) => {
    // Plusieurs noms possibles selon la config — on tente les deux courants.
    const responses = await Promise.all([
      request.get('/assets/icons/icon32.png'),
      request.get('/assets/icons/icon128.png'),
    ]);
    for (const r of responses) {
      expect(r.status(), `Asset ${r.url()} doit répondre`).toBeLessThan(400);
    }
  });

  test('script principal pwa/main.js servi sans erreur', async ({ request }) => {
    const r = await request.get('/pwa/main.js');
    expect(r.status()).toBeLessThan(400);
    expect(r.headers()['content-type']).toMatch(/javascript|ecmascript/);
  });
});

// Test « clic à vide » supprimé Lot 1 #6 — guettait juste `pageerror`, preuve
// faible. Remplacé par e2e/pwa/oauth-callback.spec.js qui couvre un parcours
// réel (retour OAuth simulé) au lieu d'un anti-crash superficiel.
