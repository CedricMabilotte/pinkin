// pwa/platform-pwa.js
// ─────────────────────────────────────────────────────────────────────────────
// Auth de la PWA — surface PWA.
//
// Depuis la refonte D1, PWA et extension partagent le même flux : OAuth 2.0
// Authorization Code + PKCE. Toute la logique commune — PKCE, échange du code,
// refresh, stockage chiffré — vit dans core/auth/pkce-auth.js. Avant, ce fichier
// la dupliquait intégralement ; il ne garde désormais que le SPÉCIFIQUE PWA :
//
//   - le flux est en DEUX temps : _interactiveAuth redirige la page entière vers
//     Google ; handleCallback s'exécute au retour, sur la page de callback ;
//   - le code_verifier doit survivre à cette redirection -> sessionStorage.
//
// Côté extension, launchWebAuthFlow fait tout dans un seul contexte : c'est
// pourquoi, malgré le module commun, les deux surfaces gardent un fichier de
// plateforme distinct. Le module commun, lui, ignore tout du navigateur.
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateCodeVerifier, generateCodeChallenge, generateState, buildAuthUrl,
  exchangeCodeForTokens, refreshAccessToken, revokeToken,
  createTokenStore, isExpired, toTokenData, hasScope
} from '../core/auth/pkce-auth.js';

// Client OAuth de la PWA — décision opérateur S9-ter (voie γ) : les valeurs
// CLIENT_ID + CLIENT_SECRET ne vivent plus dans le code suivi. On les
// récupère via l'endpoint /api/oauth-config exposé par worker.js, qui les lit
// depuis les env vars Cloudflare (PINKIN_PWA_CLIENT_ID + secret).
//
// Le fetch est mémoïsé en une promesse module-level : déclenchée à la
// première méthode async qui en a besoin, partagée par tous les appels
// suivants. Reste « stale » tant que le module n'est pas rechargé — si on
// régénère le secret côté Google, un reload navigateur suffit.
//
// Note : le secret reste DE FACTO public (n'importe qui peut curl
// /api/oauth-config). Voir worker.js et JUSTIFICATION_OAUTH.md pour la
// justification (le redirect URI verrouillé côté Google est la vraie
// protection, pas la confidentialité du secret).
let _oauthConfigPromise = null;
async function getOAuthConfig() {
  if (!_oauthConfigPromise) {
    _oauthConfigPromise = fetch('/api/oauth-config', {
      cache: 'no-store',
    }).then(async (r) => {
      if (!r.ok) throw new Error('OAUTH_CONFIG_FETCH_' + r.status);
      const cfg = await r.json();
      if (!cfg.clientId || !cfg.clientSecret) {
        throw new Error('OAUTH_CONFIG_INCOMPLETE');
      }
      return cfg;
    }).catch((err) => {
      // Reset le cache de promesse en cas d'échec — sinon les appels suivants
      // ré-utiliseraient la promesse rejetée et ne tenteraient jamais à nouveau.
      _oauthConfigPromise = null;
      throw err;
    });
  }
  return _oauthConfigPromise;
}

const REDIRECT_URI   = window.location.origin + '/auth/callback';
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];
const WRITE_SCOPE    = 'https://www.googleapis.com/auth/contacts';   // englobe la lecture
const TOKEN_KEY      = 'pinkin_auth_token';
const VERIFIER_KEY   = 'pkce_verifier';   // clé sessionStorage, le temps d'un aller-retour
const STATE_KEY      = 'pkce_state';      // jeton anti-CSRF, idem

const store = createTokenStore(TOKEN_KEY);

// Mémoïse un refresh en vol — évite deux refresh concurrents sur jeton expiré.
let _pendingRefresh = null;

// Interface identique à celle d'avant la refonte (getAccessToken / handleCallback
// / revoke) : pwa/main.js et core/services/contacts-sync.js n'ont rien à changer.
export const PWAAuth = {

  // Retourne un access_token valide, ou déclenche la redirection OAuth.
  // Trois cas, du moins au plus coûteux :
  //   1) jeton en cache encore valide         -> rendu tel quel
  //   2) expiré mais refresh_token disponible -> refresh silencieux
  //   3) sinon                                -> redirection vers Google
  async getAccessToken({ scopes = DEFAULT_SCOPES } = {}) {
    const stored = await store.load();

    if (stored && !isExpired(stored)) {
      return stored.access_token;
    }

    if (stored?.refresh_token) {
      try {
        if (!_pendingRefresh) {
          _pendingRefresh = (async () => {
            const { clientId, clientSecret } = await getOAuthConfig();
            const refreshed = await refreshAccessToken({
              clientId, clientSecret, refreshToken: stored.refresh_token
            });
            const tokenData = toTokenData(refreshed, stored);  // conserve le refresh_token
            await store.save(tokenData);
            return tokenData.access_token;
          })().finally(() => { _pendingRefresh = null; });
        }
        return await _pendingRefresh;
      } catch {
        // Refresh token révoqué/expiré -> on retombe sur l'auth interactive.
      }
    }

    // Déclenche la redirection OAuth — l'exécution ne revient pas ici.
    await this._interactiveAuth(scopes);
  },

  // Redirige la page entière vers l'écran de consentement Google.
  async _interactiveAuth(scopes) {
    const { clientId } = await getOAuthConfig();
    const verifier  = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state     = generateState();

    // verifier et state doivent survivre à la redirection : sessionStorage.
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    window.location.href = buildAuthUrl({
      clientId,
      redirectUri:   REDIRECT_URI,
      scopes,
      codeChallenge: challenge,
      state,
      // Autorisation incrémentale : un futur upgrade de scope (D1) conserve les
      // scopes déjà accordés.
      extraParams:   { include_granted_scopes: 'true' }
    });

    // La page se redirige vers Google. On bloque ici sur une promesse jamais
    // résolue : sans ça, getAccessToken poursuivrait et renverrait undefined
    // avant que la navigation n'ait eu lieu (token undefined -> requête ratée).
    return new Promise(() => {});
  },

  // Appelé sur la page de callback (par pwa/main.js), après la redirection
  // Google. Échange le code contre les jetons et les persiste chiffrés.
  async handleCallback(code, returnedState) {
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    const state    = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);

    // Anti-CSRF : on n'échange le code que si le state renvoyé correspond à
    // celui qu'on a émis. Un callback OAuth forgé est ainsi rejeté.
    if (!returnedState || returnedState !== state) {
      throw new Error('STATE_MISMATCH');
    }

    const { clientId, clientSecret } = await getOAuthConfig();
    const tokens    = await exchangeCodeForTokens({
      clientId, clientSecret,
      redirectUri: REDIRECT_URI, code, codeVerifier: verifier
    });
    // previous : conserve le refresh_token déjà accordé si Google ne le renvoie
    // pas au ré-octroi (cas possible lors d'un upgrade de scope).
    const previous  = await store.load();
    const tokenData = toTokenData(tokens, previous || {});
    await store.save(tokenData);
    return tokenData.access_token;
  },

  // Déconnexion : révocation du jeton côté Google + effacement local.
  async revoke() {
    const stored = await store.load();
    // Révoquer le refresh_token de préférence : il invalide toute la grant.
    if (stored) await revokeToken(stored.refresh_token || stored.access_token);
    await store.clear();
  },

  // Opt-in écriture : élève le scope vers contacts. Redirige vers le
  // consentement Google — la page ne revient pas ici.
  async upgradeScope() {
    await this._interactiveAuth([WRITE_SCOPE]);
  },

  // État de l'auth sans déclencher de flux : { authenticated, writeGranted }.
  async getStatus() {
    const stored = await store.load();
    return {
      authenticated: !!stored?.access_token,
      writeGranted:  hasScope(stored, WRITE_SCOPE)
    };
  }
};
