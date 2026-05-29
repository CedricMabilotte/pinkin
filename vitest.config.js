// vitest.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Configuration Vitest — couche tests unitaires & DOM léger.
//
// CHOIX. Vitest a remplacé `node:test` (session #6) pour deux raisons :
//   1. couvrir le DOM des modules UI (orchestrator, carnet, contact-panel) via
//      happy-dom, qu'il intègre nativement par projet ;
//   2. apporter un écosystème pro réutilisable (watch, coverage, mocks, UI)
//      pour les projets sœurs (freechi, troisiemesvoix, goorg, igor).
//
// API préservée. Les 36 tests de #5 utilisaient `node:test` + `node:assert`.
// Vitest accepte ces deux imports tels quels : la migration n'a touché que
// `import test from 'node:test'` → `import { test } from 'vitest'`. Les
// `assert.deepEqual` restent valides (vitest est compatible node:assert).
//
// DEUX PROJETS. Les tests purs (Node) et les tests DOM (happy-dom) cohabitent
// via la clé `projects` — un même `npm test` les passe tous les deux, avec le
// bon environnement pour chacun. Pas d'isolement coûteux : c'est juste de la
// segmentation par pattern de fichier.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclure le dossier e2e (couvert par Playwright, pas Vitest).
    exclude: ['node_modules', 'e2e/**', 'lib/**', 'dist/**'],

    // Projets : segmente par environnement d'exécution.
    projects: [
      {
        // Tests purs — modèles, services sans DOM. Tournent sous Node.
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/**/*.test.js'],
          exclude: ['test/dom/**'],
        },
      },
      {
        // Tests DOM légers — modules UI qui touchent au document/window sans
        // exiger un navigateur réel. happy-dom est ~3x plus rapide que jsdom.
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['test/dom/**/*.test.js'],
        },
      },
    ],
  },
});
