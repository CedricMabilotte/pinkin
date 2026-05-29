// pwa/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée de la PWA.
//
// Comme extension/popup/popup.js, ce fichier ne contient plus l'orchestration :
// extraite en session #4 vers ui/orchestrator.js, source unique partagée. Il ne
// garde que le SPÉCIFIQUE PWA :
//   - l'injection de l'auth (PWAAuth) dans Platform ;
//   - la capture, dès l'évaluation du module, d'un éventuel retour de
//     consentement OAuth — AVANT que pwa/main.js ne nettoie l'URL ;
//   - le descripteur de surface passé à startApp().
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from '../core/platform.js';
import { PWAAuth } from './platform-pwa.js';
import { startApp } from '../ui/orchestrator.js';

// Injection plateforme — DOIT précéder tout appel core, donc startApp().
Platform.auth = PWAAuth;

// Capture du retour de consentement OAuth. On revient d'une redirection Google
// quand pwa/main.js a vu un ?code= dans l'URL ; il a alors posé le drapeau
// window.__pinkinAuthCallback puis lancé l'échange du code, qui émettra
// 'pinkin:auth-complete' une fois terminé.
//
// POURQUOI LE DRAPEAU, ET NON L'URL. main.js et ce fichier sont deux modules
// d'index.html : ils s'exécutent dans l'ordre du document, et main.js s'évalue
// ENTIÈREMENT — y compris son history.replaceState() qui efface le ?code= —
// avant que ce module-ci ne commence. Relire l'URL ici donnerait donc toujours
// « pas de code » (bug de la PWA repéré en session #5). On lit le drapeau, posé
// de façon synchrone par main.js : lui est garanti d'avoir tourné avant nous.
//
// L'abonnement à l'événement se fait MAINTENANT, à l'évaluation du module,
// avant tout await — et bien avant que l'échange réseau de main.js ne résolve :
// aucun risque de manquer 'pinkin:auth-complete'.
const authCallback = window.__pinkinAuthCallback
  ? new Promise(resolve =>
      window.addEventListener('pinkin:auth-complete', resolve, { once: true }))
  : null;

startApp({
  // La PWA est servie depuis la racine du domaine -> assetBase '/'.
  assetBase: '/',
  connectMessage: 'Redirection vers Google…',
  // L'auth interactive PWA redirige la page entière vers Google.
  interactiveAuthRedirects: true,
  // Promise résolue quand pwa/main.js a fini d'échanger le code, ou null si on
  // n'arrive pas d'un consentement.
  authCallback
});
