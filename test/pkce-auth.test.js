// test/pkce-auth.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de core/auth/pkce-auth.js — jusqu'ici SANS AUCUN test alors
// que c'est le module le plus sensible du dépôt (échange OAuth, refresh,
// révocation, stockage chiffré du jeton). Ajouté lors d'une revue de
// durcissement — voir AUDIT_DURCISSEMENT.md pour le contexte complet.
//
// COUVERTURE.
//   - PKCE : verifier/challenge/state ont la bonne forme (base64url, longueur,
//     non-réutilisation).
//   - buildAuthUrl : tous les paramètres requis présents, state optionnel.
//   - exchangeCodeForTokens / refreshAccessToken : succès, et échec HTTP —
//     l'erreur doit porter le détail renvoyé par Google (sinon un diagnostic
//     de refus est impossible en prod).
//   - revokeToken : best-effort, ne jette JAMAIS même si le réseau échoue ;
//     no-op si aucun token.
//   - toTokenData : expires_in -> expires_at, conservation de refresh_token
//     et scope depuis `previous` quand la réponse ne les renvoie pas (cas du
//     refresh, où Google ne renvoie pas de nouveau refresh_token).
//   - isExpired / hasScope : bornes (marge de 60 s, scope absent).
//   - createTokenStore : aller-retour chiffré via Platform, et JSON corrompu
//     traité comme une absence (re-auth) plutôt qu'une exception qui plante l'app.
//
// MOCKS. `global.fetch` stubbé par test (helpers/mock-fetch.js).
// `core/platform.js` substitué par le mock mémoire partagé
// (helpers/mock-platform.js, usage 2 — substitution de module) : le module
// réel s'appuie sur `localStorage`/`chrome.storage`, deux globals absents de
// l'environnement Node de Vitest ('unit' project) — le mock évite une
// dépendance à un polyfill implicite. Le chiffrement (WebCrypto,
// core/crypto.js) lui n'est PAS mocké : il tourne pour de vrai, comme dans
// test/crypto.test.js.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';
import { jsonResponse, mockFetchOnce } from './helpers/mock-fetch.js';

vi.mock('../core/platform.js', async () => {
  const { makeMemoryPlatform } = await import('./helpers/mock-platform.js');
  return { Platform: makeMemoryPlatform() };
});

// L'import ordinaire livre le mock ci-dessus ; `_store` sert au reset entre
// tests et à l'inspection de ce qui est persisté au repos.
const { Platform } = await import('../core/platform.js');

const {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  createTokenStore,
  isExpired,
  toTokenData,
  hasScope,
} = await import('../core/auth/pkce-auth.js');

beforeEach(() => {
  Platform._store.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PKCE — verifier / challenge / state', () => {
  test('generateCodeVerifier : base64url, haute entropie, jamais deux fois identique', () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
    expect(v1).toMatch(/^[A-Za-z0-9_-]+$/); // pas de + / = (base64url)
    expect(v1.length).toBeGreaterThan(30);  // 32 octets encodés
  });

  test('generateCodeChallenge : SHA-256 déterministe du verifier, forme base64url', async () => {
    const verifier = generateCodeVerifier();
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2); // déterministe pour un même verifier
    expect(c1).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(c1).not.toBe(verifier);
  });

  test('generateState : anti-CSRF, jamais deux fois identique', () => {
    const s1 = generateState();
    const s2 = generateState();
    expect(s1).not.toBe(s2);
    expect(s1).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('buildAuthUrl', () => {
  test('assemble tous les paramètres requis, méthode S256, state inclus', () => {
    const url = buildAuthUrl({
      clientId: 'CID', redirectUri: 'https://pinkin.org/auth/callback',
      scopes: ['a', 'b'], codeChallenge: 'CHALL', state: 'STATE123',
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('CID');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://pinkin.org/auth/callback');
    expect(parsed.searchParams.get('scope')).toBe('a b');
    expect(parsed.searchParams.get('code_challenge')).toBe('CHALL');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('state')).toBe('STATE123');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
  });

  test('state omis si non fourni (pas de state="undefined" dans l\'URL)', () => {
    const url = buildAuthUrl({
      clientId: 'CID', redirectUri: 'https://x', scopes: 'a', codeChallenge: 'CHALL',
    });
    expect(new URL(url).searchParams.has('state')).toBe(false);
  });
});

describe('exchangeCodeForTokens', () => {
  test('succès : renvoie le JSON Google tel quel', async () => {
    mockFetchOnce(jsonResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }));
    const result = await exchangeCodeForTokens({
      clientId: 'CID', clientSecret: 'SECRET', redirectUri: 'https://x',
      code: 'CODE', codeVerifier: 'VERIFIER',
    });
    expect(result.access_token).toBe('AT');
    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('échec HTTP : l\'erreur porte le détail Google (diagnostic possible)', async () => {
    mockFetchOnce(jsonResponse(
      { error: 'invalid_grant', error_description: 'Bad code' },
      { ok: false, status: 400 }
    ));
    await expect(
      exchangeCodeForTokens({ clientId: 'C', clientSecret: 'S', redirectUri: 'R', code: 'X', codeVerifier: 'V' })
    ).rejects.toThrow(/400/);
  });
});

describe('refreshAccessToken', () => {
  test('succès : renvoie un access_token frais', async () => {
    mockFetchOnce(jsonResponse({ access_token: 'NEW_AT', expires_in: 3600 }));
    const result = await refreshAccessToken({ clientId: 'C', clientSecret: 'S', refreshToken: 'RT' });
    expect(result.access_token).toBe('NEW_AT');
  });

  test('échec HTTP : erreur explicite (ex. refresh_token révoqué)', async () => {
    mockFetchOnce(jsonResponse({ error: 'invalid_grant' }, { ok: false, status: 400 }));
    await expect(
      refreshAccessToken({ clientId: 'C', clientSecret: 'S', refreshToken: 'REVOKED' })
    ).rejects.toThrow(/REFRESH_FAILED/);
  });
});

describe('revokeToken — best-effort', () => {
  test('no-op si aucun token (pas d\'appel réseau)', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    await revokeToken(null);
    expect(fn).not.toHaveBeenCalled();
  });

  test('token dans le CORPS de la requête, jamais dans l\'URL', async () => {
    const fn = mockFetchOnce(jsonResponse({}));
    await revokeToken('SECRET_TOKEN');
    const [url, opts] = fn.mock.calls[0];
    expect(url).not.toContain('SECRET_TOKEN'); // pas en query string
    expect(opts.body.toString()).toContain('SECRET_TOKEN'); // bien dans le corps
  });

  test('réseau en échec : ne JETTE PAS (best-effort, la déconnexion locale continue)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NETWORK_DOWN')));
    await expect(revokeToken('T')).resolves.toBeUndefined();
  });
});

describe('toTokenData', () => {
  test('expires_in -> expires_at (horodatage absolu futur)', () => {
    const before = Date.now();
    const data = toTokenData({ access_token: 'AT', refresh_token: 'RT', scope: 'a b', expires_in: 3600 });
    expect(data.access_token).toBe('AT');
    expect(data.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000);
  });

  test('refresh (pas de refresh_token dans la réponse) : conserve celui de `previous`', () => {
    const previous = { refresh_token: 'OLD_RT', scope: 'a b' };
    const data = toTokenData({ access_token: 'NEW_AT', expires_in: 3600 }, previous);
    expect(data.refresh_token).toBe('OLD_RT');
    expect(data.scope).toBe('a b');
  });

  test('ni réponse ni previous : refresh_token/scope null (pas "undefined")', () => {
    const data = toTokenData({ access_token: 'AT', expires_in: 3600 });
    expect(data.refresh_token).toBeNull();
    expect(data.scope).toBeNull();
  });
});

describe('isExpired', () => {
  test('token absent ou sans expires_at : considéré expiré', () => {
    expect(isExpired(null)).toBe(true);
    expect(isExpired({})).toBe(true);
  });

  test('marge de 60s : un token qui expire dans 30s est déjà considéré expiré', () => {
    expect(isExpired({ expires_at: Date.now() + 30_000 })).toBe(true);
  });

  test('token valide avec large marge : pas expiré', () => {
    expect(isExpired({ expires_at: Date.now() + 3600_000 })).toBe(false);
  });
});

describe('hasScope', () => {
  test('scope présent parmi plusieurs, séparés par espace', () => {
    expect(hasScope({ scope: 'a b c' }, 'b')).toBe(true);
  });

  test('scope absent, ou token sans scope du tout', () => {
    expect(hasScope({ scope: 'a b' }, 'z')).toBe(false);
    expect(hasScope({}, 'a')).toBe(false);
    expect(hasScope(null, 'a')).toBe(false);
  });
});

describe('createTokenStore — stockage chiffré', () => {
  test('save puis load : aller-retour fidèle, valeur chiffrée au repos (pas le JSON en clair)', async () => {
    const store = createTokenStore('pinkin_token');
    const tokenData = { access_token: 'AT', refresh_token: 'RT', expires_at: Date.now() + 3600_000 };

    await store.save(tokenData);

    // Ce qui est réellement écrit dans le store mocké n'est pas le JSON en clair
    // (encrypt() renvoie { iv, ciphertext }) — invariant de confidentialité au repos.
    const raw = Platform._store.get('pinkin_token');
    expect(raw).toHaveProperty('iv');
    expect(raw).toHaveProperty('ciphertext');
    expect(JSON.stringify(raw)).not.toContain('AT');
    expect(JSON.stringify(raw)).not.toContain('RT');

    const loaded = await store.load();
    expect(loaded).toEqual(tokenData);
  });

  test('clear : le prochain load renvoie null', async () => {
    const store = createTokenStore('pinkin_token');
    await store.save({ access_token: 'AT' });
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  test('donnée corrompue (JSON invalide après déchiffrement) : load renvoie null, ne jette pas', async () => {
    // On simule la corruption en écrivant, via le Platform mocké, un objet
    // chiffré VALIDE dont le contenu déchiffré n'est pas du JSON — le cas
    // réel visé est une donnée altérée en stockage, pas un échec de crypto.
    const { encrypt } = await import('../core/crypto.js');
    const store = createTokenStore('pinkin_token_corrupt_test');
    const bogus = await encrypt('ceci n\'est pas du JSON {{{', Platform);
    await Platform.set('pinkin_token_corrupt_test', bogus);
    const loaded = await store.load();
    expect(loaded).toBeNull();
  });
});
