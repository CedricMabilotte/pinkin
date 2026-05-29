// core/auth/pkce-auth.js
// ─────────────────────────────────────────────────────────────────────────────
// Module d'authentification OAuth 2.0 + PKCE — GÉNÉRIQUE et forkable.
//
// Intention : mutualiser tout ce que l'extension et la PWA font à l'identique
// pour s'authentifier auprès de Google. Avant cette refonte, chaque surface
// avait sa propre implémentation ; l'extension passait même par
// chrome.identity.getAuthToken, une API propriétaire à Google Chrome (inopérante
// dans Brave/Edge/Chromium). Désormais les deux surfaces partagent ce module et
// un flux unique : Authorization Code + PKCE.
//
// CE QUI EST GÉNÉRIQUE (ici, dans core/) : PKCE, construction de l'URL d'auth,
// échange du code, rafraîchissement, stockage chiffré du jeton.
//
// CE QUI RESTE SPÉCIFIQUE À LA SURFACE (hors de ce module) : la manière
// d'OUVRIR la fenêtre OAuth et de RÉCUPÉRER le code de retour —
// chrome.identity.launchWebAuthFlow côté extension, redirection + page de
// callback côté PWA. Ce module ne touche jamais au navigateur : on lui fournit
// un code, il fait le reste. C'est ce qui le rend forkable tel quel.
//
// PKCE (Proof Key for Code Exchange) protège le flux Authorization Code contre
// l'interception du code d'autorisation.
// NOTE GOOGLE : contrairement à d'autres fournisseurs, Google traite un client
// « Application Web » comme confidentiel et EXIGE le client_secret à l'échange
// de code — PKCE n'y est qu'une protection additionnelle, pas un substitut au
// secret. Pinkin embarque donc le secret (cf. fichiers de plateforme) ; le
// risque est borné par le verrouillage du client sur ses URIs de redirection.
// ─────────────────────────────────────────────────────────────────────────────

import { encrypt, decrypt } from '../crypto.js';
import { Platform } from '../platform.js';

// Endpoints Google — fixes, jamais configurables par un fork.
const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// ── PKCE : génération du verifier et du challenge ────────────────────────────

// Encode des octets en base64url — variante sans + / = qui, eux, casseraient
// une URL ou un en-tête.
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Le verifier : chaîne aléatoire à haute entropie. Conservé côté client le temps
// d'un aller-retour OAuth, jamais transmis dans l'URL d'autorisation.
export function generateCodeVerifier() {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  return base64url(random);
}

// Le challenge : SHA-256 du verifier. C'est LUI qui voyage dans l'URL d'auth.
// Google le retient et exigera, à l'échange du code, le verifier correspondant.
export async function generateCodeChallenge(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(hash));
}

// Jeton aléatoire anti-CSRF (paramètre OAuth `state`). Émis avec la requête
// d'autorisation et vérifié à l'identique au retour : un callback forgé — state
// absent ou différent — est rejeté avant tout échange de code.
export function generateState() {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  return base64url(random);
}

// ── Construction de l'URL d'autorisation ─────────────────────────────────────

// Assemble l'URL vers laquelle envoyer l'utilisateur pour qu'il consente.
// extraParams ouvre la porte à l'autorisation incrémentale
// (include_granted_scopes) lors de l'upgrade de scope de D1 — sans toucher
// à ce module.
export function buildAuthUrl({ clientId, redirectUri, scopes, codeChallenge, state, extraParams = {} }) {
  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 Array.isArray(scopes) ? scopes.join(' ') : scopes,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
    access_type:           'offline',  // condition pour recevoir un refresh_token
    prompt:                'consent',  // force l'écran de consentement -> refresh_token à chaque octroi
    ...extraParams
  });
  if (state) params.set('state', state);   // jeton anti-CSRF, vérifié au retour
  return `${AUTH_ENDPOINT}?${params}`;
}

// ── Échange du code et rafraîchissement ──────────────────────────────────────

// Échange le code d'autorisation contre access_token + refresh_token.
// Aucun client_secret transmis : c'est le code_verifier qui prouve l'identité.
export async function exchangeCodeForTokens({ clientId, clientSecret, redirectUri, code, codeVerifier }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,   // exigé par Google même en PKCE (cf. en-tête)
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
      code,
      code_verifier: codeVerifier
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    // On remonte le corps d'erreur de Google (error / error_description) :
    // sans lui, le diagnostic d'un échec d'échange est impossible.
    const detail = await res.text().catch(() => '');
    throw new Error(`TOKEN_EXCHANGE_FAILED [${res.status}] ${detail}`);
  }
  return res.json();  // { access_token, refresh_token, expires_in, scope, ... }
}

// Échange un refresh_token contre un access_token frais. Pas d'UI, pas de
// fenêtre : c'est ce qui rend le rafraîchissement silencieux.
export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,   // exigé par Google même en PKCE (cf. en-tête)
      grant_type:    'refresh_token',
      refresh_token: refreshToken
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`REFRESH_FAILED [${res.status}] ${detail}`);
  }
  return res.json();  // { access_token, expires_in, ... } — sans nouveau refresh_token
}

// Révoque un jeton côté Google. Appelé à la déconnexion.
export async function revokeToken(token) {
  if (!token) return;
  try {
    // token dans le CORPS, pas dans l'URL : un secret ne doit pas transiter en
    // query string (journaux serveur, historique, en-têtes Referer).
    await fetch('https://oauth2.googleapis.com/revoke', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ token }),
      signal:  AbortSignal.timeout(10000)
    });
  } catch {
    // Révocation best-effort : si le réseau échoue, on efface quand même le
    // jeton localement (côté appelant). On n'empêche pas la déconnexion.
  }
}

// ── Stockage chiffré du jeton ────────────────────────────────────────────────
// Le refresh_token est un secret long terme : il vit chiffré (AES-GCM, cf.
// core/crypto.js) dans le stockage de la plateforme. C'est la décision
// « Option B » du brief — désormais respectée par les DEUX surfaces.

export function createTokenStore(storageKey) {
  return {
    async save(tokenData) {
      const encrypted = await encrypt(JSON.stringify(tokenData), Platform);
      await Platform.set(storageKey, encrypted);
    },

    async load() {
      const encrypted = await Platform.get(storageKey);
      if (!encrypted) return null;
      try {
        return JSON.parse(await decrypt(encrypted, Platform));
      } catch {
        return null;  // données corrompues -> traitées comme une absence -> re-auth
      }
    },

    async clear() {
      await Platform.set(storageKey, null);
    }
  };
}

// ── Helpers d'état du jeton ───────────────────────────────────────────────────

// Vrai si le jeton est expiré ou sur le point de l'être. Marge de 60 s pour ne
// pas partir en requête avec un jeton qui meurt en vol.
export function isExpired(tokenData) {
  return !tokenData?.expires_at || Date.now() > (tokenData.expires_at - 60_000);
}

// Normalise une réponse Google : convertit expires_in (durée relative) en
// expires_at (horodatage absolu), plus simple à comparer ensuite.
// `previous` permet de conserver le refresh_token et le scope lors d'un refresh,
// car Google ne renvoie le refresh_token qu'à l'octroi initial.
export function toTokenData(googleResponse, previous = {}) {
  return {
    access_token:  googleResponse.access_token,
    refresh_token: googleResponse.refresh_token ?? previous.refresh_token ?? null,
    scope:         googleResponse.scope ?? previous.scope ?? null,
    expires_at:    Date.now() + (googleResponse.expires_in ?? 3600) * 1000
  };
}

// Vrai si le jeton stocké couvre le scope demandé. Servira en D1 pour savoir si
// l'écriture (scope contacts) a été accordée, sans relancer un flux d'auth.
export function hasScope(tokenData, scope) {
  return !!tokenData?.scope && tokenData.scope.split(' ').includes(scope);
}
