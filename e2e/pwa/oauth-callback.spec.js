// e2e/pwa/oauth-callback.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Test E2E — retour de consentement OAuth de la PWA.
//
// PORTÉE. Le bug central corrigé en session #5 : `pwa/main.js` détecte un
// `?code=...` dans l'URL, pose `window.__pinkinAuthCallback = true` AVANT
// que `pwa/app.js` ne lise l'URL (qui sera ensuite nettoyée). Sans ce
// drapeau synchrone, app.js ne voyait jamais le retour de consentement et
// l'utilisateur retombait sur l'écran d'accueil.
//
// CRITÈRE B. Ce test prouve, sans Google :
//   1. la détection du `?code=` dans l'URL fonctionne (drapeau posé) ;
//   2. l'URL est NETTOYÉE après détection (le code ne fuite pas en Referer
//      ni en historique) ;
//   3. `handleCallback` est invoqué (preuve indirecte : on observe la
//      tentative d'échange — fetch vers oauth2.googleapis.com).
//
// MOCKAGE. `PWAAuth.handleCallback` appelle Google pour échanger le code.
// On intercepte la requête réseau pour répondre 400 (code fake invalide,
// réponse Google réaliste). On vérifie ENSUITE que le flag est posé et
// l'URL nettoyée — c'est ce qui prouve que le bug de séquencement #5 est
// fermé.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

test.describe('PWA — callback OAuth (régression bug #5)', () => {
  test('?code=fake déclenche __pinkinAuthCallback et nettoie l\'URL', async ({ page }) => {
    // PIÈGE DÉCOUVERT EN DÉBOGAGE. handleCallback vérifie un state anti-CSRF
    // stocké en sessionStorage (`pinkin_pkce_state`). Sans state correspondant,
    // il throw STATE_MISMATCH avant tout fetch ; le `.catch` de main.js exécute
    // `window.location.href='/'` et la page recharge avant qu'on puisse lire
    // l'état. SOLUTION : on pré-pose state + verifier en sessionStorage AVANT
    // l'évaluation de tout script de la page (addInitScript), pour que le
    // check passe et que handleCallback aille jusqu'au fetch — qu'on fige.
    // Clés réelles utilisées par platform-pwa.js (VERIFIER_KEY / STATE_KEY).
    await page.addInitScript(() => {
      sessionStorage.setItem('pkce_state', 'fakestate');
      sessionStorage.setItem('pkce_verifier', 'fakeverifier');
    });

    // DEUXIÈME PIÈGE (post-refactor S9-ter, voie γ). handleCallback commence
    // par getOAuthConfig() -> fetch('/api/oauth-config'), un endpoint qui
    // n'existe QUE côté Worker Cloudflare de prod — jamais dans
    // pwa/dev-server.js. Sans interception, le 404 fait throw
    // OAUTH_CONFIG_FETCH_404 avant tout fetch Google ; le .catch de main.js
    // navigue vers '/' et le test échoue (gap connu, TAF.md « Dev local :
    // fallback /api/oauth-config »). On sert ici une config FACTICE au niveau
    // du test — correctif de test, pas d'architecture : la décision « où vit
    // le secret en dev local » reste à l'opérateur (AUDIT_DURCISSEMENT.md §5).
    await page.route('**/api/oauth-config', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clientId: 'fake-client-id.apps.googleusercontent.com',
        clientSecret: 'fake-client-secret',
      }),
    }));

    // Figer la requête d'échange : la promesse reste pending, handleCallback
    // ne résout pas, pas de redirect. Promesse jamais résolue (pas de timer :
    // un setTimeout suivi d'un route.abort() post-fermeture de page génère du
    // bruit asynchrone inutile) — Playwright dispose les handlers à la
    // fermeture de la page.
    let oauthExchangeAttempted = false;
    await page.route('**/oauth2.googleapis.com/**', async () => {
      oauthExchangeAttempted = true;
      await new Promise(() => {});
    });

    // Arrivée simulée depuis Google.
    await page.goto('/?code=fakecode&state=fakestate');

    // 1) Drapeau synchrone posé AVANT que app.js ne s'évalue. C'est
    // l'invariant central du correctif #5 (window.__pinkinAuthCallback).
    // Timeout généreux : sous charge parallèle (autres specs en cours), le
    // chargement de pwa/main.js peut prendre plusieurs secondes.
    await page.waitForFunction(() => window.__pinkinAuthCallback === true, {
      timeout: 10_000,
    });

    // 2) URL nettoyée — le code OAuth ne doit plus être dans window.location
    // (en-tête Referer des requêtes suivantes, historique).
    const search = await page.evaluate(() => window.location.search);
    expect(search).toBe('');
    const pathname = await page.evaluate(() => window.location.pathname);
    expect(pathname).toBe('/');

    // 3) Tentative d'échange du code — confirme que handleCallback a passé
    // le check state et atteint le fetch. expect.poll plutôt qu'un sleep
    // fixe : sous charge, 200 ms ne suffisent pas toujours ; le poll
    // réessaie jusqu'à 5 s et se termine dès que c'est vrai.
    await expect.poll(() => oauthExchangeAttempted, { timeout: 5_000 }).toBe(true);
  });

  test('URL sans ?code= : aucun drapeau ni tentative d\'échange', async ({ page }) => {
    let oauthExchangeAttempted = false;
    await page.route('**/oauth2.googleapis.com/**', (route) => {
      oauthExchangeAttempted = true;
      route.fulfill({ status: 400, body: '{}' });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const flag = await page.evaluate(() => window.__pinkinAuthCallback);
    expect(flag).toBeUndefined();
    expect(oauthExchangeAttempted).toBe(false);
  });
});
