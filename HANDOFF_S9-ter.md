# HANDOFF — Session #9-ter : voie γ (repo public + secrets sortis)

Dernier point de reprise après l'écrasement de l'historique git. À lire dans
l'ordre : `BRIEF_PINKIN.md`, `HANDOFF_S9.md` (en archive locale —
voir plus bas), puis ce fichier.

Convention conservée : **[VÉRIFIÉ]** = constaté à l'exécution runtime ;
**[SUPPOSÉ]** = correct sur lecture + contrôle syntaxique, non éprouvé
en runtime.

Note méthode : la session #9-ter s'est étalée sur deux passes opérateur
distinctes (S9-bis = revirement hébergeur Cloudflare + migration NS ;
S9-ter = MARS-prod critique + voie γ secrets/repo public). Toutes
documentées ici. La numérotation reste séquentielle ; pas de #10 ouvert
avant clôture de #9-ter.

---

## Où en est le produit

V1.0 est **prête à soumettre** au double sens :
- Code & infra : pinkin.org en ligne, HTTPS, mail préservé, sécurité L5
  préservée structurellement, repo réellement public et cohérent avec
  les claims « open source ».
- Submission gates : 5 captures CWS + vidéo OAuth restent les seules
  actions opérateur préalables.

Tests : 117 unit/DOM (vitest) — verts à chaque pivot du refactor. E2E
(14 PWA-headless + 10 PWA-auth) non re-tournés cette passe (sandbox
Cowork, cf. L12 héritée).

---

## Ce qui a changé depuis HANDOFF_S9.md (résumé exécutif)

### Sécurité & cohérence

- **Repo `CedricMabilotte/pinkin` est désormais PUBLIC.** Les claims
  « open source » de privacy / terms / landing / FICHE_CWS /
  JUSTIFICATION_OAUTH sont désormais véritablement exécutables :
  un reviewer Google ou un utilisateur curieux peut auditer le code
  en clic-clic, comme c'est documenté.
- **Les deux CLIENT_SECRET Google ont été rotés.** L'extension utilise
  `extension/background/secrets.js` (gitignored). La PWA utilise une
  env var encrypted Cloudflare consommée par `worker.js` et exposée
  côté browser via `/api/oauth-config`.
- **L'historique git d'avant le refactor a été écrasé** par squash en
  un seul commit « Pinkin V1.0 — initial public release ». Les 61
  commits précédents (qui contenaient les anciens secrets) sont
  préservés dans la branche locale `archive/pre-public-v1` chez Cédric,
  jamais poussée. Côté GitHub : commit `220a969` unique sur main.

### Hébergement

- `pinkin.org` est servi par un Cloudflare Worker (mode Workers + assets
  binding, plus assets-only). Le Worker a une seule route dynamique
  `/api/oauth-config` ; tout le reste tombe sur `env.ASSETS.fetch`.
- Migration NS Gandi → Cloudflare effective (cf. décision @neo
  `2026-05-29_pinkin-org-migration-ns-cloudflare.md`). Mail @pinkin.org
  préservé (MX/SPF/DKIM/SRV).
- Search Console verification acquise (méthode HTML file, validée).
- HTTPS auto-provisionné par Cloudflare. HSTS preload, COOP same-origin,
  Referrer-Policy strict-origin, X-Frame DENY, X-Content-Type nosniff,
  Permissions-Policy fermée sur camera/microphone/geolocation —
  servis depuis `_headers`.

### Site web

- Landing `index.html` + `privacy` + `terms` désormais **réellement
  trilingues fr/en/es de bout en bout** (article par langue ; switcher ;
  title et meta description adaptatifs).
- Open Graph + Twitter Card sur les 3 pages publiques. og:image
  `assets/og/og-image.png` 1200×630 généré (koala-pin + brand + URL).
- favicon.ico multi-résolution (16/32/48/128).
- sitemap.xml + robots.txt custom (autorise tout, déclare le sitemap).
- Liens « Code source » du footer pointent maintenant vers le repo
  public.

### Workflow OAuth

- L'OAuth callback redirige Google vers `pinkin.org/auth/callback`.
  Cloudflare rewrite (`_redirects`) sert le HTML de la PWA à cette URL
  sans changer le path visible. `pwa/main.js` lit `?code=&state=`,
  fait l'échange, puis `replaceState({}, '', '/pwa/')` en prod
  (`/` en dev).

---

## Le fil des deux passes

### Passe S9-bis — revirement hébergeur (29 mai, matinée)

Reprise S9 (commit `87a5027` côté ancien historique, équivalent dans le
squash) : opérateur valide la voie γ-ancienne version (« faisons les
audits A+B+C+landing+bump »). Au cours du chantier landing, choix
hébergeur initial = GitHub Pages (alignement parc opérateur).

Objection en clôture S9 : GitHub Pages Free exige repo public, ce qui
matérialise le risque CLIENT_SECRET en clair (décision #5 / L5).

Trois voies présentées (Cloudflare Pages depuis repo privé / régénérer
secrets + repo public + GitHub Pages / GitHub Pro). Opérateur tranche
Voie 1 : Cloudflare Pages depuis repo privé, retour à la reco S8.

Implémentation Cloudflare laborieuse — la nouvelle UI unifiée Workers
& Pages ne propose plus le flow Pages historique. Pivot en Workers
Static Assets. Migration NS Gandi → Cloudflare (Cloudflare Workers
custom domain exige zone Cloudflare). Tout fonctionne fin de matinée :
HTTPS sur pinkin.org, mail préservé, custom domain bindé.

### Passe S9-ter, partie A — MARS-prod critique (29 mai, après-midi)

Opérateur signale : « privacy/terms pas traduits, menu langue
disparaît, footer disparaît ». Lancement MARS-prod sur le site live.

Audit en 16 axes. Trois graines opérateur confirmées + 11 trouvailles
supplémentaires. Plan de remédiation P0/P1/P2 (lots A/B/C). Tout
exécuté en un commit unique :
- Pages legal trilingues complètes (~1500 lignes de traductions).
- Footer riche cohérent sur les 3 pages publiques.
- `<main>` sémantique sur privacy/terms.
- OG + Twitter Card. sitemap.xml. robots.txt. favicon multi-res.
  Headers HTTP durcis via `_headers`.
- og:image 1200×630 dédié.
- `start_url` PWA → `/pwa/` (l'install PWA ouvrait la landing).
- `_redirects` pour rewrite `/auth/callback` → `/pwa/index.html`.
  Suite à erreur wrangler « infinite loop detected », corrigé en
  rewrite vers `/pwa/`.

### Passe S9-ter, partie B — voie γ (29 mai, fin)

Opérateur rouvre l'arbitrage open source : « repo privé vs claims
open source partout, c'est incohérent ».

Analyse de menace du CLIENT_SECRET : le secret est de fait public dans
toute distribution (zip CWS, PWA déployée). La vraie protection est le
verrouillage du redirect URI côté Google. Le secret n'apporte pas de
confidentialité cryptographique dans cette architecture.

Décision opérateur : Voie γ — sortir les secrets du code suivi + repo
public + accepter l'honnêteté technique.

Refactor :
- `extension/background/secrets.{example,}.js` — modèle versionné +
  vrai fichier gitignored.
- `extension/background/auth-worker.js` — import depuis `./secrets.js`.
- `pwa/platform-pwa.js` — fetch async `/api/oauth-config` au boot
  (mémoïsé en promesse module-level).
- `worker.js` (nouveau) — entry Cloudflare Worker, expose
  `/api/oauth-config` qui lit `env.PINKIN_PWA_CLIENT_*`.
- `wrangler.toml` — bascule en mode `main = "worker.js"` + assets
  binding.
- `scripts/pack-extension.sh` — contrôle # 9 : refuse de packer si
  `secrets.js` absent ou placeholder.

Cloudflare auto-deploy webhook resté cassé tout au long de la session.
Workaround : déploiement direct via `wrangler` installé dans le
sandbox + token `pinkin-APItoken`. Marche.

Rotation secrets (opérateur, via UI Google Cloud Console — note :
Google a remplacé « Reset secret » par « Add secret + Disable old »).
Nouveau secret extension collé dans `secrets.js` local par l'opérateur.
Nouveau secret PWA collé dans dashboard Cloudflare directement (voie
zero-chat : le secret n'a jamais transité par le chat).

Vérifications en prod : `/api/oauth-config` retourne bien le nouveau
secret (SHA-256 distinct du placeholder et de l'ancien). Rewrite
`/auth/callback` HTTP 200. Headers sécurité présents. Pas de fuite L5.

Avant le toggle public, hygiène anti-Secret-Scanning : placeholder
`GOCSPX-YOUR_EXTENSION_CLIENT_SECRET` (qui a même format qu'un vrai
secret Google) remplacé par `<<REPLACE-WITH-EXTENSION-CLIENT-SECRET>>`
dans `secrets.example.js` et `pack-extension.sh`.

Squash de l'historique git : branche `archive/pre-public-v1` créée
LOCALEMENT chez Cédric (jamais poussée) — préserve les 61 commits
S1→S9-ter. Main = orphan checkout + tout le tree actuel + commit
unique. Force-push origin main. Origin/main = `220a969`.

Toggle visibility GitHub → Public. Vérifications externes : repo HTTP
200, `git clone` ne voit qu'un commit, recherche `GOCSPX-` dans tout
le tree + historique public renvoie zéro hit (les placeholders ont
été rebrand). Sécurité L5 structurellement préservée par
`.assetsignore` qui exclut `extension/background/`.

---

## Architecture finale — diagramme rapide

```
                  ┌──────────────────────────────────────┐
                  │  https://pinkin.org                  │
                  │  Cloudflare Worker `pinkin-org`      │
                  │                                       │
                  │   GET /api/oauth-config              │
                  │     → { clientId, clientSecret }     │
                  │       depuis env.PINKIN_PWA_CLIENT_* │
                  │                                       │
                  │   tout le reste                       │
                  │     → env.ASSETS.fetch                │
                  │       (avec _redirects + _headers     │
                  │        + .assetsignore)              │
                  └──────────────┬───────────────────────┘
                                 │
                  ┌──────────────┴────────────────────────┐
                  │  Repo GitHub (PUBLIC)                  │
                  │  CedricMabilotte/pinkin                │
                  │                                         │
                  │   • code source extension + PWA        │
                  │   • landing + privacy + terms          │
                  │   • worker.js (entry CF)               │
                  │   • secrets.example.js (modèle)        │
                  │                                         │
                  │   secrets.js (gitignored, jamais       │
                  │   poussé — vit côté disque opérateur)  │
                  └────────────────────────────────────────┘

  PWA :
    boot → fetch /api/oauth-config → utilise clientId+clientSecret
           pour OAuth code exchange + refresh token

  Extension Chrome (livrée via zip CWS) :
    embarque extension/background/secrets.js dans le binaire
    distribué (inévitable architecturalement). auth-worker.js
    import statique.
```

---

## Vérifié vs supposé — l'état réel après #9-ter

**[VÉRIFIÉ]** :
- Repo GitHub `CedricMabilotte/pinkin` PUBLIC, HTTP 200.
- Clone fresh : 1 seul commit `220a969`.
- Aucun `GOCSPX-` de format secret réel dans le tree ni l'historique public.
- `secrets.js` absent du tracking git.
- `https://pinkin.org/api/oauth-config` retourne `clientId` + `clientSecret`
  (SHA-256 du secret distinct du placeholder).
- `https://pinkin.org/auth/callback?code=...&state=...` → HTTP 200, URL
  préservée (rewrite Cloudflare actif).
- Pages publiques trilingues vérifiées par grep `data-lang`.
- Headers sécurité HSTS preload + COOP + Permissions-Policy + Referrer
  + X-Content + X-Frame présents.
- OG image, favicon multi-res, sitemap, robots tous HTTP 200.
- Sécurité L5 : `/extension/background/auth-worker.js`, `secrets.js`,
  `HANDOFF_S9.md`, `wrangler.toml` → tous HTTP 404 publiquement.
- `npm test` 117/117 verts après chaque pivot.
- Branche locale `archive/pre-public-v1` existe avec 61 commits archivés.

**[SUPPOSÉ]** — à éprouver côté navigateur réel :
- Bascule trilingue runtime (switcher, persistance localStorage).
- Boot complet de la PWA + OAuth end-to-end avec nouveau secret PWA.
- Service worker PWA s'enregistre.
- Sondage `npm run dev:pwa` local fonctionne toujours après refactor
  `getOAuthConfig` (dev-server.js doit servir `/api/oauth-config` aussi
  — à vérifier ou à coder un fallback dev local).
- Cloudflare auto-deploy webhook GitHub : à re-tester maintenant que
  le repo est public, le webhook redevient peut-être actif.

---

## Décisions en attente / portes ouvertes

- **Désactiver les anciens secrets côté Google.** Tu as ajouté de
  nouveaux secrets via « Add secret » ; les anciens restent listés
  comme actifs mais non utilisés. À désactiver côté UI Google Cloud
  Console pour propreté.
- **Compte développeur CWS** (5 $, payé S9-bis). Reste à uploader
  `dist/pinkin-v1.0.0.zip` (2.4 Mo, embarque nouveau secret extension)
  et soumettre revue magasin.
- **Vidéo OAuth** selon `PLAN_VIDEO_OAUTH.md` (storyboard à jour des
  libellés EN finaux). Upload YouTube Unlisted.
- **5 captures 1280×800** selon `FICHE_CWS.md`.
- **Submit OAuth verification** dans Google Cloud Console (textes
  JUSTIFICATION_OAUTH.md à jour avec la réalité technique honnête).
- **dev-server.js** : ajouter un endpoint `/api/oauth-config` pour le
  développement local (sans Cloudflare). Sinon `npm run dev:pwa` ne
  peut plus tester l'OAuth depuis localhost. Variante : `secrets.js`
  côté PWA aussi (gitignored), fallback si fetch 404.
- **Cloudflare auto-deploy webhook GitHub** : à re-tester. Si toujours
  cassé après le passage public, soit reconnecter la GitHub app côté
  Cloudflare, soit garder `wrangler` depuis sandbox comme méthode de
  déploiement.

---

## Pour démarrer la session suivante

`BRIEF_PINKIN.md` → `HANDOFF_S9.md` (côté archive locale) → ce fichier →
`TAF.md` à jour → `lecons-pinkin.md` (L13-L18 cohérents) → puis selon
l'objectif :

- *Submission OAuth* : enregistrer vidéo selon PLAN_VIDEO_OAUTH.md ;
  soumettre formulaire Cloud Console avec textes JUSTIFICATION_OAUTH.md.
- *Submission CWS* : captures 1280×800 selon FICHE_CWS.md ; upload
  `dist/pinkin-v1.0.0.zip` ; visibilité Non-listé ; soumettre revue.
- *Dev local* : ajouter fallback `/api/oauth-config` à dev-server.js
  avant que tu ne reprennes le développement actif.

Ne pas traiter un `[SUPPOSÉ]` comme acquis. L4 vit, L8 vit, L12 vit.
