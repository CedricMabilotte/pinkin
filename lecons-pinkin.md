# Leçons — pinkin

Journal cumulatif des leçons de session (routine-fin, étape 6). À relire en
début de session : une leçon qui réapparaît signale un problème de fond.

Format d'une entrée : énoncé · verdict · statut.

---

## Réactivation — 2026-10-07

**L20 — Un `package.json` modifié sans régénérer `package-lock.json` casse
`npm ci` sur le runner, pas en local.** Incident : `@vitest/coverage-v8`
ajouté en devDependency le 2026-07-18 (`d398b32`) ; le lock datait du
2026-05-29 et ne le contenait pas. En local `npm install` tolère l'écart
(165/165 vrais), mais `npm ci` refuse un lock désynchronisé et sort en
code 1 — avant même que Vitest ne démarre. Les deux premiers pushes de la
réactivation (`4b02163`, `a556a1d`, doc uniquement) ont donc rougi la CI
sans qu'aucun test n'ait échoué. Lire le *step* en échec dans le job, pas
le nom du job : « Unit & DOM failed » masquait « `npm ci` failed ».
Correctif : lock régénéré (`baa4a14`), actions en `@v5` (`00e77a1`),
run vert.
Piège secondaire : le npm 10.9 embarqué dans Node 22 plante
(`Cannot read properties of null (reading 'edgesOut')`) sur les peer-deps
de Vitest 4.1 — **régénérer le lock avec `npx npm@latest install`**, pas
avec le npm par défaut. Règle : tout commit qui touche `devDependencies`
embarque le lock, et on vérifie le run avant de fermer la session.
Verdict : *incident réel, cause hors code*. Statut : **clos**.

## Session #9-ter — 2026-05-29 (MARS-prod critique site)

**L13 — Pivot d'hébergeur → re-audit éditorial obligatoire.** En S9-bis et
S9-ter, le passage à Cloudflare a été techniquement réussi (HTTPS, sécurité,
mail préservé, custom domain bind), mais l'audit éditorial des pages SERVIES
sur le nouveau domaine n'a pas été refait. L'opérateur a découvert au coup
d'œil que privacy/terms étaient mono-langues et orphelines (pas de switcher,
pas de footer riche) — alors que ces écarts existaient déjà dans le repo S8
mais étaient masqués par le fait qu'aucune passe « ouvre le site final »
n'avait été déclenchée. La passe MARS-prod en S9-ter a tout remonté.

Verdict : *garde-fou de méthode*. Statut : **clos** — la routine-fin Pinkin
intègre désormais une étape « lancer une passe MARS-prod sur le rendu final
si une session a touché l'infrastructure de livraison ». Une session « ship »
n'est pas finie tant qu'on n'a pas vu le rendu final livré.

**L14 — `start_url` du manifest PWA pointe sur l'app installée, jamais sur
la marketing landing.** Pinkin V1.0 expédiait `manifest.webmanifest` avec
`start_url = "/"` — un utilisateur qui installe la PWA depuis Chrome se
retrouvait sur la landing au lieu de la carte. Corrigé en S9-ter à `/pwa/`.

Verdict : *garde-fou*. Statut : **clos** — règle V1 : à chaque release,
re-vérifier que `start_url` matche l'URL d'usage réel de l'app (`/pwa/` pour
Pinkin, `/app/` pour d'autres conventions, etc.). À intégrer au script
`pack-extension.sh` plus tard comme contrôle défensif # 9 (lecture du
manifest.webmanifest, vérification du start_url).

**L15 — « Code source » dans un footer pointe vers le repo, ou disparaît.**
Pinkin V1 affichait « Code source » dans le footer de la landing → lien
vers `github.com/CedricMabilotte/` (le profil GitHub de l'auteur, pas le
repo `pinkin` qui est privé). Trompeur dès lors qu'on a tranché S9-bis
« repo reste privé pour préserver L5 ». Solution court terme : retirer le
lien (fait S9-ter). Solution long terme : voie 2 héritée S9-bis
(régénération secrets + repo public) — à arbitrer plus tard.

Verdict : *correction immédiate*. Statut : **clos** (court terme).
Ré-ouvrir si l'opérateur décide la voie 2.

---

## Session #9-ter (suite voie γ) — 2026-05-29 (après-midi)

**L16 — Cloudflare auto-deploy webhook fragile : `wrangler` local en
fallback opérationnel.** Cas vécu en S9-ter : après le deuxième push de
la session, Cloudflare ne re-déclenche plus de build (webhook GitHub →
Cloudflare silencieux, aucun nouveau deployment listé via API). Bloque
tout sondage post-push. Solution trouvée : installer `wrangler` dans le
sandbox (`npm install --no-save wrangler`), auth via `CLOUDFLARE_API_TOKEN`
+ `CLOUDFLARE_ACCOUNT_ID`, puis `wrangler deploy` pousse directement le
Worker depuis le sandbox sans passer par le webhook GitHub.

Verdict : *garde-fou opérationnel*. Statut : **clos** — wrangler reste
disponible comme méthode de déploiement de secours. À reconsidérer si
le webhook GitHub → Cloudflare se ré-active sur le repo public, mais
même alors `wrangler` reste utile pour les déploiements sans push
(p. ex. tester une variante rapide). Note : le contrôle suivant de
session ouvre la question « Cloudflare auto-deploy s'est-il rétabli
post-repo-public ? ».

**L17 — Squash + branche archive locale pour la transition privé → public.**
Question opérateur S9-ter : « peut-on virer tout l'historique et repartir
d'une base propre ? ». Trois options envisagées (garder + Resolve as
revoked / squash sur même repo / nouveau repo). Choix : squash via
`git checkout --orphan` + force-push, AVEC backup local en branche
`archive/pre-public-v1` qui conserve les 61 commits historiques mais
n'est jamais poussée. Avantage : `origin/main` = 1 seul commit propre
côté public, historique narratif détaillé conservé localement.

Verdict : *bonne pratique transitoire — clos en l'état*. Statut : **clos**.
Reproductible la prochaine fois qu'un repo Pinkin-like passera de privé
à public.

**L18 — Séquence ordonnée pour rotation de secrets en zéro-downtime.**
Apprentissage S9-ter sur le bon ordre quand on change un secret OAuth
qui sert en prod ET embarqué dans plusieurs surfaces (extension + PWA) :

  1. Refactor du code pour lire le secret depuis une source externe
     (fichier gitignored côté extension, env var Cloudflare côté PWA).
  2. Push le refactor (le code lit le secret « depuis l'extérieur » mais
     l'extérieur contient encore l'ancien).
  3. Déployer côté Cloudflare avec le secret externe = ancien (continuité).
  4. Opérateur ajoute un NOUVEAU secret côté Google Cloud (deux secrets
     coexistent, l'ancien et le nouveau, tous deux acceptés par Google).
  5. Opérateur pose le NOUVEAU secret côté env var Cloudflare / fichier
     extension local. Cloudflare lit le nouveau au runtime suivant ;
     côté extension le prochain pack-extension prendra le nouveau.
  6. Vérification end-to-end : nouveau secret bien servi.
  7. Opérateur DÉSACTIVE l'ancien secret côté Google (puisque plus rien
     ne l'utilise).

Cassures évitées : si on désactivait l'ancien avant l'étape 5, la prod
casserait. Si on collait le nouveau avant l'étape 4, le pivot serait
encore plus risqué. La séquence 1→7 garantit zéro-downtime même si la
session multi-étapes est interrompue à n'importe quel point intermédiaire.

Verdict : *consignée comme procédure*. Statut : **clos** — pattern
réutilisable pour toute rotation de secret futur.

**L19 — Un outil d'édition peut substituer des guillemets typographiques aux
délimiteurs de chaîne JS, sans erreur de build visible.** Incident S10 :
lors du passage i18n complet des chaînes d'`ui/shell.js`, `ui/orchestrator.js`,
`ui/contact-panel.js` en appels `t('...')`, l'outil d'édition a remplacé des
guillemets droits (U+0027) par des guillemets typographiques (U+2018/U+2019)
DANS certains appels `t()` — pas dans le texte affiché (ça, c'est légitime en
français), mais dans les délimiteurs de la chaîne elle-même. Symptôme : écran
blanc dans le navigateur natif, aucune erreur exploitable en sandbox Cowork
(pas de rendu réel testable côté agent). Corrigé par remplacement en masse.

Cassure évitée pour la prochaine fois : durci par
`scripts/check-smart-quotes.mjs` (`npm run check:quotes`, câblé dans le job
`unit` de `.github/workflows/tests.yml` — revue de durcissement, voir
AUDIT_DURCISSEMENT.md) : scanne `core/ ui/ extension/ pwa/` pour les quatre
caractères typographiques, échoue si trouvé. `i18n/*.js` est explicitement
exclu du scan — les guillemets typographiques y sont légitimes, ils font
partie du TEXTE traduit affiché à l'utilisateur, pas des délimiteurs de code.

Verdict : *incident réel avec effet visible (écran blanc), désormais
détecté automatiquement à la prochaine régression*. Statut : **clos**.
