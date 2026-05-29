// extension/popup/popup.js
// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée de l'extension Chrome.
//
// Ce fichier ne contient PLUS l'orchestration. Depuis l'extraction de la
// session #4, la séquence boot → auth → sync → géocodage → carte → état
// d'écriture vit dans ui/orchestrator.js — source unique partagée avec la PWA.
// Ce fichier ne garde que ce qui est SPÉCIFIQUE à la surface extension :
//   - l'injection de l'auth (ExtensionAuth) dans Platform ;
//   - le descripteur de surface passé à startApp().
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from '../../core/platform.js';
import { ExtensionAuth } from '../platform-extension.js';
import { startApp } from '../../ui/orchestrator.js';

// Injection plateforme — DOIT précéder tout appel core, donc startApp().
Platform.auth = ExtensionAuth;

startApp({
  // L'extension est imbriquée de deux niveaux (extension/popup/) -> '../../'.
  assetBase: '../../',
  connectMessage: 'Connexion… une fenêtre Google va s’ouvrir.',
  // launchWebAuthFlow résout dans le même contexte : l'auth interactive ne
  // quitte pas la page. Pas de callback OAuth à attendre non plus.
  interactiveAuthRedirects: false
});
