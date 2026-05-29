// extension/background/service-worker.js
// ─────────────────────────────────────────────────────────────────────────────
// Service Worker Manifest V3 — contexte background de l'extension.
// Pas d'accès au DOM. Deux rôles depuis la refonte D1 :
//   - héberger l'authentification (auth-worker.js), car le SW survit à la
//     fenêtre OAuth de launchWebAuthFlow là où le popup, lui, se ferme ;
//   - répondre aux messages du popup qui délègue son auth ici.
// Module ES : autorisé par "type": "module" dans le manifeste.
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken, revoke, upgradeToWrite, getStatus } from './auth-worker.js';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('Pinkin installé — bienvenue.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Ouverture de l'app dans un ONGLET, et non dans un popup.
//
// Pourquoi : le popup d'action de Chrome se ferme dès qu'il perd le focus —
// c'est son comportement par conception. Deux usages de Pinkin le rendaient
// intenable : la fenêtre de consentement OAuth vole le focus (la première
// connexion semblait planter), et le géocodage incrémental dure plusieurs
// minutes (la moindre perte de focus l'interrompait ET détruisait le travail
// non encore persisté). Un onglet, lui, survit. Le manifeste ne déclare donc
// plus de `default_popup` : sans popup, un clic sur l'icône déclenche
// chrome.action.onClicked, traité ici.
//
// Plomberie d'extension générique — rien de spécifique au fork Freechi.
// ─────────────────────────────────────────────────────────────────────────────

// Page de l'app. Le fichier conserve son nom historique `popup.html` : le
// renommer toucherait une dizaine d'imports pour un gain purement cosmétique.
const APP_PAGE = chrome.runtime.getURL('extension/popup/popup.html');

// Clé de mémorisation de l'onglet Pinkin courant. chrome.storage.session est
// choisi à dessein plutôt qu'une variable de module : le service worker MV3
// est éphémère, une variable globale ne survivrait pas à sa mise en veille.
// `session` s'efface à la fermeture du navigateur — exactement la durée de vie
// d'un onglet, donc aucune valeur obsolète ne traîne d'une session à l'autre.
// Choix face à l'alternative chrome.tabs.query({url}) : celle-ci aurait exigé
// la permission `tabs`. On l'évite — un manifeste avare en permissions allège
// l'audit de soumission (Phase E).
const TAB_KEY = 'pinkin_tab_id';

// Garde-fou singleton : un seul onglet Pinkin à la fois. Sans lui, chaque clic
// sur l'icône empilerait un onglet de plus — donc une sync et un géocodage de
// plus, et autant d'appels Nominatim concurrents se disputant le rate-limit.
async function openApp() {
  const stored = await chrome.storage.session.get(TAB_KEY);
  const knownTabId = stored[TAB_KEY];

  if (knownTabId != null) {
    try {
      // L'onglet existe-t-il encore ? chrome.tabs.get rejette sinon.
      const tab = await chrome.tabs.get(knownTabId);
      // Il existe : on le réactive et on amène sa fenêtre au premier plan,
      // plutôt que d'en ouvrir un second.
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch {
      // Onglet fermé entre-temps : on tombe sur la création ci-dessous.
    }
  }

  const tab = await chrome.tabs.create({ url: APP_PAGE });
  await chrome.storage.session.set({ [TAB_KEY]: tab.id });
}

chrome.action.onClicked.addListener(() => { openApp(); });

// Quand l'onglet Pinkin se ferme, on oublie son id : le prochain clic recrée un
// onglet neuf au lieu de tenter de réactiver un fantôme.
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
  const stored = await chrome.storage.session.get(TAB_KEY);
  if (closedTabId === stored[TAB_KEY]) {
    await chrome.storage.session.remove(TAB_KEY);
  }
});

// Fabrique le gestionnaire d'échec d'une opération d'auth : journalise dans la
// console du service worker ET renvoie l'erreur au popup. Le journal est
// essentiel : quand le popup s'est fermé pendant le consentement, la réponse
// n'arrive nulle part — la console du SW est alors la seule trace.
function fail(label, sendResponse) {
  return (err) => {
    console.error(`[Pinkin auth] ${label}:`, err?.message || err);
    sendResponse({ ok: false, error: err?.message || String(err) });
  };
}

// Messagerie popup -> service worker.
// Le popup (platform-extension.js) ne fait jamais l'auth lui-même : il la
// délègue ici. Raison : c'est le popup qui se ferme pendant la fenêtre OAuth,
// pas le service worker.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message?.type === 'AUTH_GET_TOKEN') {
    getAccessToken({ scopes: message.scopes, interactive: message.interactive })
      .then(accessToken => sendResponse({ ok: true, accessToken }))
      .catch(fail('AUTH_GET_TOKEN', sendResponse));
    return true;  // réponse asynchrone -> garder le canal de message ouvert
  }

  if (message?.type === 'AUTH_REVOKE') {
    revoke()
      .then(() => sendResponse({ ok: true }))
      .catch(fail('AUTH_REVOKE', sendResponse));
    return true;
  }

  if (message?.type === 'AUTH_UPGRADE_SCOPE') {
    // Opt-in écriture : élève le scope vers contacts (fenêtre de consentement).
    upgradeToWrite()
      .then(() => sendResponse({ ok: true }))
      .catch(fail('AUTH_UPGRADE_SCOPE', sendResponse));
    return true;
  }

  if (message?.type === 'AUTH_STATUS') {
    getStatus()
      .then(status => sendResponse({ ok: true, ...status }))
      .catch(fail('AUTH_STATUS', sendResponse));
    return true;
  }

  return false;  // message non reconnu
});
