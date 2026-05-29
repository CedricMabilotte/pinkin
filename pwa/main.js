// pwa/main.js
// Point d'injection plateforme pour la PWA
// Injecte PWAAuth dans Platform, gère le callback OAuth si on arrive depuis Google

import { Platform } from '../core/platform.js';
import { PWAAuth } from './platform-pwa.js';

Platform.auth = PWAAuth;

// Détection callback OAuth — ?code= dans l'URL après redirection Google
const params = new URLSearchParams(window.location.search);
const code   = params.get('code');
const state  = params.get('state');

if (code) {
  // Signal SYNCHRONE à destination de pwa/app.js. Les deux fichiers sont des
  // modules chargés par index.html ; main.js (celui-ci) s'évalue ENTIÈREMENT
  // avant app.js. Or la ligne suivante efface le ?code= de l'URL. app.js, qui
  // s'évalue ensuite, ne peut donc PAS détecter le retour de consentement en
  // relisant l'URL — elle est déjà nettoyée. On pose ici un drapeau, lu par
  // app.js, qui dit « un échange de code OAuth est en cours, attends
  // pinkin:auth-complete avant de démarrer ». (Bug constaté en session #5 :
  // l'ancienne détection par ?code= dans app.js était toujours fausse.)
  window.__pinkinAuthCallback = true;

  // Nettoyer l'URL AVANT tout traitement : le code OAuth ne doit pas subsister
  // dans window.location (en-tête Referer des requêtes suivantes, historique).
  // En prod (pinkin.org), Cloudflare rewrite /auth/callback vers /pwa/index.html
  // mais l'URL visible reste /auth/callback. On la corrige à /pwa/ pour qu'un
  // refresh ultérieur tombe bien sur la PWA. En dev (localhost), '/' fait
  // l'affaire — dev-server.js sert la PWA partout.
  const isProd = window.location.hostname === 'pinkin.org' ||
                 window.location.hostname.endsWith('.pages.dev') ||
                 window.location.hostname.endsWith('.workers.dev');
  const cleanUrl = isProd ? '/pwa/' : '/';
  window.history.replaceState({}, document.title, cleanUrl);

  // Échanger le code — handleCallback vérifie le state (anti-CSRF) au passage.
  PWAAuth.handleCallback(code, state).then(() => {
    window.dispatchEvent(new CustomEvent('pinkin:auth-complete'));
  }).catch(err => {
    console.error('Callback failed:', err);
    window.location.href = cleanUrl;
  });
}

export { Platform };
