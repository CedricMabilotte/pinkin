// worker.js — Cloudflare Worker entry pour pinkin.org
// ─────────────────────────────────────────────────────────────────────────────
// Décision opérateur S9-ter (voie γ) : le repo `pinkin` passe en public pour
// honorer les claims « open source » de privacy.html / terms.html / landing
// (cohérence éthique + facilite la validation OAuth Google).
//
// Conséquence : les CLIENT_SECRET OAuth (extension + PWA) ne peuvent plus
// vivre dans le code suivi. Côté extension, ils vont dans
// extension/background/secrets.js (gitignored). Côté PWA, l'app a besoin du
// secret au runtime — qui doit donc être servi au navigateur. Ce Worker
// expose `/api/oauth-config` qui retourne la paire { clientId, clientSecret }
// depuis les env vars Cloudflare (CLIENT_ID en clair dans wrangler.toml, le
// secret en var encrypted via dashboard ou `wrangler secret put`).
//
// HONNÊTETÉ TECHNIQUE. Cette API rend le secret PWA visible à quiconque
// fait `curl https://pinkin.org/api/oauth-config`. Ce n'est PAS un gain de
// sécurité — le secret reste de fait public. Le seul gain est l'hygiène
// d'historique git (GitHub Secret Scanning ne déclenche plus, donc le repo
// peut être public sans révocation automatique).
//
// Le mécanisme de protection réel reste le verrouillage du redirect URI côté
// Google (cf. JUSTIFICATION_OAUTH.md) : un attaquant qui exfiltre le secret
// ne peut PAS l'utiliser car Google n'accepte de redirection que vers les
// URIs enregistrées (`chromiumapp.org/<ext-id>` côté extension,
// `pinkin.org/auth/callback` côté PWA).
//
// "Worker JS" plutôt que "assets-only" est strictement minimal : tout le
// trafic non-/api/* est délégué à env.ASSETS.fetch — préserve les rewrites
// de `_redirects`, les exclusions de `.assetsignore`, les headers de
// `_headers`. Pinkin reste un site statique avec un seul endpoint dynamique.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Endpoint OAuth config — PWA fetch ici au boot pour récupérer le secret.
    if (url.pathname === '/api/oauth-config') {
      const body = JSON.stringify({
        clientId:     env.PINKIN_PWA_CLIENT_ID     || '',
        clientSecret: env.PINKIN_PWA_CLIENT_SECRET || '',
      });
      return new Response(body, {
        headers: {
          'Content-Type':  'application/json; charset=utf-8',
          // Pas de cache navigateur — si on régénère le secret côté Google,
          // les clients doivent récupérer le nouveau au prochain boot, pas
          // un ancien valeur depuis le cache.
          'Cache-Control': 'no-store, must-revalidate',
          // Pas de référence côté Cloudflare edge cache non plus.
          'CDN-Cache-Control': 'no-store',
        },
      });
    }

    // Tout le reste : assets statiques (avec rewrites _redirects et headers
    // _headers déjà configurés).
    return env.ASSETS.fetch(request);
  },
};
