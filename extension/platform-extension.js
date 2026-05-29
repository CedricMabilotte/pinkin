// extension/platform-extension.js
// ─────────────────────────────────────────────────────────────────────────────
// Auth de l'extension — CÔTÉ UI. Ce fichier est un PROXY, pas l'implémentation.
//
// L'auth réelle vit dans le service worker (extension/background/auth-worker.js).
// Deux raisons de l'y centraliser : le service worker est le contexte le plus
// stable de l'extension, et il reste l'unique propriétaire du jeton — un seul
// endroit qui sait le rafraîchir et le révoquer. Ce fichier ne fait que router
// les demandes de l'UI vers le service worker, par message.
//
// Note historique : du temps où l'UI était un popup d'action, ce proxy était
// une nécessité dure — le popup était détruit dès l'ouverture de la fenêtre
// OAuth, donc incapable d'héberger l'auth. L'UI vit maintenant dans un onglet
// stable (cf. service-worker.js) : le proxy n'est plus imposé, mais il reste le
// bon design — un propriétaire d'auth unique. Et la réponse du worker arrive
// désormais à une UI encore vivante, là où le popup mourait avant de la recevoir.
// ─────────────────────────────────────────────────────────────────────────────

// Envoie un message au service worker et renvoie sa réponse comme promesse.
// On garde la forme callback + chrome.runtime.lastError : c'est elle qui détecte
// proprement un service worker injoignable.
function sendToWorker(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'AUTH_FAILED'));
        return;
      }
      resolve(response);
    });
  });
}

// Interface identique à celle d'avant la refonte (getAccessToken / revoke) :
// popup.js et core/services/contacts-sync.js n'ont donc rien à changer.
export const ExtensionAuth = {
  // Retourne un access_token valide. Le service worker gère cache, refresh et
  // auth interactive. opts peut porter { scopes, interactive } — utilisé en D1
  // pour l'upgrade vers le scope écriture.
  async getAccessToken(opts = {}) {
    const res = await sendToWorker({ type: 'AUTH_GET_TOKEN', ...opts });
    return res.accessToken;
  },

  // Déconnexion : révoque le jeton côté Google et l'efface localement.
  async revoke() {
    await sendToWorker({ type: 'AUTH_REVOKE' });
  },

  // Opt-in écriture : élève le scope vers contacts. Déclenche une fenêtre de
  // consentement (le popup peut se fermer ; cf. note en tête de fichier).
  async upgradeScope() {
    await sendToWorker({ type: 'AUTH_UPGRADE_SCOPE' });
  },

  // État de l'auth sans déclencher de flux : { authenticated, writeGranted }.
  async getStatus() {
    const res = await sendToWorker({ type: 'AUTH_STATUS' });
    return { authenticated: res.authenticated, writeGranted: res.writeGranted };
  }
};
