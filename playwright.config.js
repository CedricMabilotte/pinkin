// playwright.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Configuration Playwright — couche E2E navigateur.
//
// PORTÉE. Trois familles de tests distinctes, isolées en « projects » :
//
//   1. pwa-headless  — la PWA, sans authentification. Tourne en headless avec
//      le Chrome système (channel: 'chrome'), couvre le boot de la coquille,
//      la navigation, les popovers, le focus trap, le mailto/tel rendus.
//
//   2. pwa-authenticated — la PWA après OAuth. Utilise un storageState
//      (auth-state.json) sauvegardé une fois par l'opérateur, ré-utilisé
//      indéfiniment. Couvre Carnet, Fiche, écriture (à activer en task #10).
//
//   3. extension — l'extension MV3 chargée non empaquetée. Demande un Chrome
//      non headless avec --load-extension. Activé plus tard (task #9 / #10) :
//      complique l'env CI, on commence par la PWA.
//
// SERVEUR. webServer.command démarre `npm run dev:pwa` AVANT les tests si le
// port n'est pas déjà pris (reuseExistingServer: true). En local, l'opérateur
// peut laisser tourner son serveur — Playwright ne le redémarrera pas. En CI,
// Playwright le démarre lui-même. C'est exactement ce qu'on veut.
//
// HEADLESS PAR DÉFAUT. Pour la reproductibilité et la CI. `npm run test:e2e:ui`
// passe en mode UI interactif (codegen, traces visuelles).
//
// TRACES. `on-first-retry` : retient une trace du parcours uniquement quand un
// test casse et qu'on le rejoue — bon ratio coût/info.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig, devices } from '@playwright/test';

// Port 3000 par défaut — aligné sur l'URI OAuth déjà autorisée côté Google
// (cf. pwa/dev-server.js). Override via PWA_BASE_URL si besoin.
const PWA_BASE_URL = process.env.PWA_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // 10s : flake observé en #7 sous parallélisation, le DOM peut mettre
  // plusieurs secondes à se monter quand 10+ workers chargent en parallèle.
  expect: { timeout: 10_000 },

  // Échec rapide en CI ; reprises locales tolérées.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Cap à 2 en local (#8 L11) : le serveur dev:pwa est mono-threadé et sature
  // au-delà. Le seuil avait été posé à 4 en #7 (machine opérateur — tenait), mais
  // #8 a observé une flakiness systématique à 4 workers dans le sandbox Cowork
  // (plus contraint) : 3-5 timeouts à 35 s sur les mêmes specs qui passent 14/14
  // vert à 2 workers. Verdict opérateur : abaisser le défaut pour aligner les
  // environnements. La suite tourne en ~30 s au lieu de ~15 s en local, mais
  // plus de divergence comportementale entre Claude et opérateur.
  workers: process.env.CI ? 1 : 2,

  // Rapporteurs : sortie console + rapport HTML autonome consultable après coup.
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  // Captures de débogage : screenshot et trace seulement sur échec.
  // Vidéo désactivée — réclame ffmpeg (binaire séparé, non installé par défaut)
  // et le couple trace + screenshot suffit largement au débogage.
  use: {
    baseURL: PWA_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Locale fr-FR par défaut : i18n (Lot 6 #7) détecte navigator.language
    // et bascule. Sous Chromium par défaut c'est 'en-US' — ce qui fait
    // basculer la PWA en anglais et casse les assertions de texte en
    // français. Force fr-FR pour les tests existants ; les tests dédiés à
    // l'i18n peuvent override via test.use({ locale: 'en-US' }).
    locale: 'fr-FR',
  },

  // Démarrage automatique du serveur de dev PWA si nécessaire.
  webServer: {
    command: 'npm run dev:pwa',
    url: PWA_BASE_URL,
    reuseExistingServer: true,
    timeout: 10_000,
  },

  projects: [
    {
      name: 'pwa-headless',
      use: {
        ...devices['Desktop Chrome'],
        // En CI, le Chrome système n'est pas disponible — Playwright télécharge
        // chromium (cf. workflow CI). En local, on évite le download en visant
        // le Chrome système (channel: 'chrome'). Le toggle se fait via CI=1.
        ...(process.env.CI ? {} : { channel: 'chrome' }),
      },
      testMatch: /pwa\/.*\.spec\.js/,
    },
    // Project 'pwa-authenticated' — E2E PWA APRÈS OAuth Google.
    //
    // Pré-requis : `npm run oauth:capture` a créé un profil persistant à
    // e2e/.auth/profile contenant les cookies Google + localStorage Pinkin
    // (cf. scripts/oauth-profile.mjs). Sans ce profil les tests skip.
    //
    // CONTRAINTES TECHNIQUES.
    //   - launchPersistentContext ne supporte qu'UN context à la fois sur
    //     un profil. Donc fullyParallel: false + workers: 1 pour ce project.
    //   - Le profil est PARTAGÉ entre tests : un test qui pollue (logout,
    //     révocation) impacte les suivants. À garder en tête.
    //
    // Activation : laissée auto — les tests détectent le profil et skip
    // proprement si absent. Pour forcer : juste lancer
    // `npx playwright test --project pwa-authenticated`.
    {
      name: 'pwa-authenticated',
      testMatch: /pwa-auth\/.*\.spec\.js/,
      fullyParallel: false,
      retries: 0,  // launchPersistentContext lent : un échec mérite diagnostic, pas un retry coûteux
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? {} : { channel: 'chrome' }),
        locale: 'fr-FR',
      },
    },
    // Project 'extension' — E2E sur l'extension MV3 chargée non empaquetée.
    // PRÉPARÉ MAIS NON ACTIF par défaut : exige un Chrome en mode headed avec
    // --load-extension, qui demande un display X (xvfb-run en CI, X local
    // accessible en dev). À activer en posant PINKIN_EXT=1.
    // Voir e2e/extension/*.spec.js — les tests auto-skip si l'env n'est pas
    // prêt. Activation : `PINKIN_EXT=1 npx playwright test --project extension`.
    {
      name: 'extension',
      testMatch: /extension\/.*\.spec\.js/,
      use: {
        // Le Chrome MV3 doit avoir une UI : pas de mode headless strict. Le
        // mode 'new' headless (Chrome 109+) supporte les extensions.
        headless: false,
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
  ],
});
