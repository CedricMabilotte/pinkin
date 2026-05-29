// e2e/pwa/boot.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Premier scénario E2E de la PWA — preuve que la chaîne fonctionne.
//
// CRITÈRE B (cf. PLAN_TESTS_V0.2.md, à venir). On ne se contente pas d'un
// filet : on PROUVE que le boot de la PWA, refondu en session #4 (extraction
// d'orchestrateur) et corrigé en #5 (callback OAuth, manifeste à la racine),
// se déroule sans erreur jusqu'à l'écran d'accueil.
//
// CONSOLE PROPRE. Aucune erreur ni avertissement console au boot. C'est le
// garde-fou silencieux : un module qui crashe à l'import (callback OAuth raté,
// manifeste 404, asset manquant) le ferait apparaître ici.
//
// ÉCRAN ATTENDU. Avant authentification, la coquille montre l'écran d'accueil
// (« Connecter à Google Contacts »). C'est le point de stop normal — la suite
// du flux (auth, sync, carte) est couverte par les projets « authenticated »
// (task #10).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

test.describe('PWA — boot de la coquille', () => {
  test('charge sans erreur console et affiche l\'écran d\'accueil', async ({ page }) => {
    // Collecte des erreurs et avertissements console pendant le boot, AVEC
    // une liste blanche de motifs non bloquants connus (révision Lot 2 #6).
    // Pourquoi filtrer : un test qui rejette TOUT warning casse au premier
    // log Leaflet/SW post-auth ; on veut un garde-fou STRICT au boot
    // pré-auth, mais qui n'attrape pas le bruit légitime quand on enrichira.
    const IGNORED = [
      /Deprecation warning/i,            // browsers déprécient parfois sans casse
      /downloadable font/i,              // chargement de police async
      /favicon.*404/i,                   // pas de favicon explicite à ce stade
    ];
    const consoleProblems = [];
    const record = (entry) => {
      if (IGNORED.some(re => re.test(entry.text))) return;
      consoleProblems.push(entry);
    };
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        record({ type: msg.type(), text: msg.text() });
      }
    });
    page.on('pageerror', (err) => {
      record({ type: 'pageerror', text: err.message });
    });

    // Charger la racine. Attente DOM-ready pour donner sa chance à
    // l'orchestrateur de tourner (boot → écran d'accueil, sans auth).
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // NOTE D'ARCHITECTURE (constat de #6). `ui/shell.js` est la SOURCE UNIQUE
    // du DOM : tous les écrans d'état (#state-auth, #state-loading, etc.) sont
    // montés simultanément et bascules par la classe `hidden`. Un locator
    // sémantique non-discriminant tombe donc sur plusieurs éléments en
    // parallèle (#btn-connect ET #btn-logout existent en parallèle) — attendu,
    // pas un bug. Les tests ciblent les identifiants stables (le « contrat
    // d'identifiants » de shell.js, ligne 11-13).
    const connectButton = page.locator('#btn-connect');
    await expect(connectButton).toBeVisible({ timeout: 5_000 });
    await expect(connectButton).toHaveText(/connecter/i);

    // L'écran d'accueil (#state-auth) est actif ; les écrans suivants restent
    // cachés tant que le flux d'auth n'a pas eu lieu.
    await expect(page.locator('#state-auth')).toBeVisible();
    await expect(page.locator('#state-loading')).toBeHidden();
    await expect(page.locator('#map')).toBeHidden();

    // Garde-fou console. Si tout est OK, le tableau doit être vide.
    if (consoleProblems.length > 0) {
      console.error('Problèmes console au boot :', JSON.stringify(consoleProblems, null, 2));
    }
    expect(consoleProblems).toEqual([]);
  });

  test('le manifeste PWA répond en 200 à la racine', async ({ request }) => {
    // Régression directe du bug #5 : le manifeste était en /pwa/ alors que
    // index.html le pointait à /. Ce test EMPÊCHE la rechute.
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('name');
  });
});
