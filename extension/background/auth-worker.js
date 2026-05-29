// extension/background/auth-worker.js
// ─────────────────────────────────────────────────────────────────────────────
// Auth de l'extension — CÔTÉ SERVICE WORKER. C'est l'implémentation réelle.
//
// Pourquoi ici et pas dans le popup : l'auth interactive passe par
// chrome.identity.launchWebAuthFlow, qui ouvre une fenêtre OAuth séparée. Le
// popup d'action est détruit par Chrome dès qu'il perd le focus — donc dès que
// cette fenêtre s'ouvre. Le service worker, lui, survit : il reste en vie tant
// qu'un appel d'API d'extension (ici launchWebAuthFlow) est en cours.
//
// Tout ce qui n'est pas spécifique au navigateur est délégué au module
// générique core/auth/pkce-auth.js. Le seul morceau propre à l'extension dans
// ce fichier : launchWebAuthFlow + getRedirectURL — ouvrir la fenêtre, récupérer
// le code. C'est exactement la frontière config/core voulue par le brief.
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateCodeVerifier, generateCodeChallenge, generateState, buildAuthUrl,
  exchangeCodeForTokens, refreshAccessToken, revokeToken,
  createTokenStore, isExpired, toTokenData, hasScope
} from '../../core/auth/pkce-auth.js';

// Client OAuth de l'extension — type « Application Web » (requis par
// launchWebAuthFlow). Identifiants importés depuis ./secrets.js (gitignored,
// créé à partir de ./secrets.example.js au premier checkout). Voir
// secrets.example.js pour la justification du split (S9-ter voie γ : repo
// passe en public, secret sort du code suivi mais reste embarqué dans le zip
// distribué côté CWS — inévitable pour un client OAuth Google « Web »).
import { CLIENT_ID, CLIENT_SECRET } from './secrets.js';

// Scope par défaut : lecture seule. L'upgrade vers le scope écriture (contacts)
// se fera en D1 en passant un `scopes` élargi à getAccessToken().
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];

// Scope écriture, demandé seulement sur opt-in explicite (D1). Il englobe la
// lecture : le demander suffit.
const WRITE_SCOPE = 'https://www.googleapis.com/auth/contacts';

const TOKEN_KEY = 'pinkin_auth_token';
const store = createTokenStore(TOKEN_KEY);

// URI de redirection virtuelle : https://<id-extension>.chromiumapp.org/
// getRedirectURL la calcule depuis l'ID figé par le champ `key` du manifeste.
// Cette URI doit être enregistrée dans le client OAuth (Cloud Console) — sans
// quoi Google refuse la redirection.
function redirectUri() {
  return chrome.identity.getRedirectURL();
}

// Déduplication des auth interactives : si une est déjà en vol (l'utilisateur a
// rouvert le popup et recliqué pendant le consentement), on réutilise la même
// promesse plutôt que d'ouvrir une 2e fenêtre OAuth concurrente.
let _pendingInteractiveAuth = null;
function interactiveAuth(scopes) {
  if (_pendingInteractiveAuth) return _pendingInteractiveAuth;
  _pendingInteractiveAuth = _runInteractiveAuth(scopes)
    .finally(() => { _pendingInteractiveAuth = null; });
  return _pendingInteractiveAuth;
}

// Authentification interactive : ouvre la fenêtre OAuth, récupère le code,
// l'échange contre les jetons, les persiste chiffrés.
async function _runInteractiveAuth(scopes) {
  // 1. PKCE + state : verifier/challenge pour cette tentative, et un state
  //    aléatoire anti-CSRF qu'on vérifiera à l'identique au retour.
  const verifier  = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state     = generateState();

  // 2. URL d'autorisation. include_granted_scopes assure l'autorisation
  //    incrémentale : un futur upgrade de scope conservera les scopes déjà
  //    accordés au lieu de les remplacer.
  const authUrl = buildAuthUrl({
    clientId:      CLIENT_ID,
    redirectUri:   redirectUri(),
    scopes,
    codeChallenge: challenge,
    state,
    extraParams:   { include_granted_scopes: 'true' }
  });

  // 3. launchWebAuthFlow ouvre la fenêtre OAuth et résout avec l'URL de
  //    redirection finale. Il maintient le service worker en vie le temps du
  //    consentement utilisateur.
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url:         authUrl,
    interactive: true
  });

  // 4. Le code (ou l'erreur) est dans les paramètres de l'URL rendue.
  const params = new URL(responseUrl).searchParams;
  const error  = params.get('error');
  if (error) throw new Error('AUTH_DENIED_' + error);   // ex: consentement refusé

  // Vérification anti-CSRF : le state renvoyé doit être exactement celui émis.
  if (params.get('state') !== state) throw new Error('AUTH_STATE_MISMATCH');

  const code = params.get('code');
  if (!code) throw new Error('AUTH_NO_CODE');

  // 5. Échange du code contre access_token + refresh_token, puis stockage.
  const tokens    = await exchangeCodeForTokens({
    clientId: CLIENT_ID, clientSecret: CLIENT_SECRET,
    redirectUri: redirectUri(), code, codeVerifier: verifier
  });
  // previous : conserve le refresh_token déjà accordé si Google ne le renvoie
  // pas au ré-octroi (cas possible lors d'un upgrade de scope).
  const previous  = await store.load();
  const tokenData = toTokenData(tokens, previous || {});
  await store.save(tokenData);
  return tokenData.access_token;
}

// Mémoïse un refresh en vol : deux appels getAccessToken concurrents avec un
// jeton expiré ne doivent pas lancer deux refresh (course sur le store).
let _pendingRefresh = null;

// Point d'entrée. Retourne un access_token valide selon trois cas, du moins au
// plus coûteux :
//   1) jeton en cache encore valide          -> rendu tel quel
//   2) expiré mais refresh_token disponible  -> refresh silencieux (sans UI)
//   3) sinon                                 -> auth interactive (fenêtre OAuth)
export async function getAccessToken({ scopes = DEFAULT_SCOPES, interactive = true } = {}) {
  const stored = await store.load();

  if (stored && !isExpired(stored)) {
    return stored.access_token;
  }

  if (stored?.refresh_token) {
    try {
      if (!_pendingRefresh) {
        _pendingRefresh = (async () => {
          const refreshed = await refreshAccessToken({
            clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: stored.refresh_token
          });
          const tokenData = toTokenData(refreshed, stored);  // conserve le refresh_token
          await store.save(tokenData);
          return tokenData.access_token;
        })().finally(() => { _pendingRefresh = null; });
      }
      return await _pendingRefresh;
    } catch {
      // Refresh token révoqué ou expiré (notamment : 7 jours en statut
      // « Testing » côté Google) -> on retombe sur l'auth interactive.
    }
  }

  if (!interactive) throw new Error('AUTH_REQUIRED');
  return interactiveAuth(scopes);
}

// Déconnexion : révocation du jeton côté Google + effacement local.
export async function revoke() {
  const stored = await store.load();
  // Révoquer le refresh_token de préférence : il invalide toute la grant côté
  // Google (l'access_token seul, surtout s'il est expiré, peut ne rien révoquer).
  if (stored) await revokeToken(stored.refresh_token || stored.access_token);
  await store.clear();
}

// Élève le scope vers l'écriture. À n'appeler que sur opt-in explicite : on
// force le passage interactif (le scope ne s'élargit qu'au consentement) ;
// include_granted_scopes — déjà posé dans interactiveAuth — conserve la lecture.
export async function upgradeToWrite() {
  return interactiveAuth([WRITE_SCOPE]);
}

// État de l'auth, sans déclencher aucun flux. Sert à l'UI pour savoir si
// l'écriture est déjà accordée.
export async function getStatus() {
  const stored = await store.load();
  return {
    authenticated: !!stored?.access_token,
    writeGranted:  hasScope(stored, WRITE_SCOPE)
  };
}
