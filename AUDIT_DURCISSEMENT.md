# Audit de durcissement — pinkin (2026-07-16)

Revue critique, amélioration et durcissement du projet, menée à la demande
de l'opérateur avec un groupe de sous-agents spécialisés (sécurité,
architecture, couverture de tests, PWA/distribution, cohérence
documentaire), puis re-vérification systématique des trouvailles avant
action — conformément à la règle du projet : *un handoff (ou un rapport
de sous-agent) est une suite de claims, pas une preuve.*

Convention : **[VÉRIFIÉ]** = re-contrôlé directement contre le code/le
dépôt distant par l'agent de synthèse, pas seulement affirmé par un
sous-agent. **[SUPPOSÉ]** = affirmé par un sous-agent, non re-contrôlé.

---

## 0. Méthode

1. Cartographie factuelle préalable : les 5 documents de haut niveau
   (`BRIEF_PINKIN.md`, `CONCEPT_MULTICARNETS.md`, `PLAN_PHASE_E.md`,
   `AUDIT_INTERACTIONS.md`, `HANDOFF_S5.md`) se sont révélés décrire un état
   du projet dépassé de 5 sessions (S6→S10) — le projet est en réalité en
   **V1.0 publiée**. Banni de bandeaux « historique/dépassé » (§5).
2. Cinq revues indépendantes en parallèle : sécurité, architecture/
   maintenabilité, couverture de tests, PWA/offline/distribution, cohérence
   documentaire.
3. **Re-vérification personnelle** de chaque trouvaille avant d'agir —
   deux trouvailles importantes se sont révélées **fausses** à la
   vérification (§2), et une trouvaille critique s'est révélée **vraie et
   déjà suspectée** dans un handoff antérieur (§1).
4. Correctifs appliqués pour les points à faible risque / haute valeur ;
   punch-list pour le reste (§6), volontairement **non exécuté** — refactors
   touchant la logique UI live d'une app déjà en revue Chrome Web Store, ou
   décisions qui appartiennent à l'opérateur (rotation de secrets, choix
   d'architecture dev-local).

---

## 1. Correctif critique — service worker PWA jamais enregistré

**[VÉRIFIÉ] directement (grep sur `serviceWorker` dans tout `pwa/*.js` et
`pwa/index.html` : une seule occurrence, dans un test e2e d'extension, sans
rapport).** `pwa/service-worker-pwa.js` existait, contenait une logique de
cache correcte sur le papier, mais rien ne l'enregistrait jamais dans le
navigateur — la promesse « offline-first » du BRIEF n'avait donc **aucun
effet réel**. Fait notable : `HANDOFF_S9-ter.md` avait déjà listé « Service
worker PWA s'enregistre » en **[SUPPOSÉ]**, jamais levé depuis S9-ter — ce
correctif referme un doute qui trainait depuis plusieurs sessions.

**Corrigé** :
- `pwa/app.js` — enregistrement (`navigator.serviceWorker.register(...)`,
  scope `/pwa/`, feature-detect + catch non bloquant).
- `pwa/service-worker-pwa.js` — réécrit : `CACHE_NAME` versionné
  explicitement (`pinkin-pwa-v1.0.0`, à bumper à chaque déploiement
  changeant des assets — l'ancien nom fixe `pinkin-v1` ne purgeait jamais
  rien) ; mise en cache « au fil de l'eau » des réponses same-origin en plus
  du précache minimal (une app vanilla JS sans étape de build ne peut pas
  maintenir à la main une liste exhaustive et à jour des fichiers à
  précacher) ; exclusion explicite de `/auth/callback` (paramètres OAuth
  transitoires) et des hôtes API externes (déjà présent, conservé).

**Non fait — à éprouver par l'opérateur** : le comportement offline réel
(couper le réseau après une première visite, vérifier que la coquille + les
contacts déjà synchronisés restent accessibles). Aucun outil à ma
disposition ne simule un vrai navigateur avec coupure réseau.

---

## 2. Trouvailles de sous-agents invalidées à la vérification

**CSP absente côté PWA** — un sous-agent (revue sécurité) l'a signalé comme
manquant. **Faux, [VÉRIFIÉ]** : `pwa/index.html` porte une balise
`<meta http-equiv="Content-Security-Policy">` complète et restrictive
(`default-src 'self'`, `object-src 'none'`, `connect-src` limité aux
domaines strictement nécessaires), et `_headers` à la racine ajoute déjà
HSTS preload, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy` fermée, `Cross-Origin-Opener-Policy`.
Aucune action nécessaire — posture déjà bonne.

**CI devrait lancer l'E2E sur chaque push** — un sous-agent (revue tests) l'a
recommandé. **Écarté après lecture de `.github/workflows/tests.yml`** : le
choix de ne lancer l'E2E Playwright qu'en déclenchement manuel est une
**décision déjà motivée et documentée** dans le fichier lui-même (flakiness
constatée sur les runners GitHub mutualisés, cf. L11/L12 dans
`lecons-pinkin.md`) — pas un oubli. Revenir dessus casserait un compromis
déjà arbitré ; non modifié.

Ces deux corrections montrent l'intérêt de la re-vérification : un rapport
de sous-agent (ou un handoff) reste une **suite de claims**, jamais une
preuve en soi.

---

## 3. Corrigé — cohérence documentaire

- **`etat-projet-pinkin.md`** listait « Repo public : décision pas encore
  arbitrée » comme point en suspens, alors que `HANDOFF_S9-ter.md` établissait
  déjà ce fait en [VÉRIFIÉ] (voie γ exécutée). **Re-vérifié en direct** :
  `github.com/CedricMabilotte/pinkin` porte le badge « Public ». Ligne
  corrigée dans `etat-projet-pinkin.md`.
- **`lecons-pinkin.md`** — `etat-projet-pinkin.md` renvoyait vers une leçon
  « L19 » inexistante (le fichier s'arrêtait à L18). Ajoutée : incident des
  guillemets typographiques S10 (cf. §4).
- **`TAF.md`** — listait l'i18n complète comme « S10 P0 à ouvrir en
  priorité » alors qu'elle était terminée (120/120 tests, confirmé par
  `etat-projet-pinkin.md`). Déplacée vers « Fait / Session #10 ».
- **`HANDOFF_S10.md`** (nouveau) — 10 commits (i18n complète + UX photo/
  footer + packaging V1.0, puis lightbox/footer/qualité photo/animation)
  n'avaient aucun handoff de clôture — routine-fin non suivie à l'époque.
  Reconstitué rétroactivement depuis les commits + `etat-projet-pinkin.md`,
  referme la chaîne narrative avant l'ouverture d'une session S11.
- **Bandeaux « historique/dépassé »** ajoutés en tête de `BRIEF_PINKIN.md`,
  `CONCEPT_MULTICARNETS.md`, `PLAN_PHASE_E.md`, `AUDIT_INTERACTIONS.md`,
  `HANDOFF_S5.md` — chacun renvoie vers la source de vérité courante
  (`etat-projet-pinkin.md` / `HANDOFF_S10.md`) sans effacer leur valeur
  d'archive (conception encore valide pour `CONCEPT_MULTICARNETS.md`,
  diagnostic déjà traité pour `AUDIT_INTERACTIONS.md`, etc. — nuance
  précisée dans chaque bandeau plutôt qu'un rejet en bloc).

---

## 4. Corrigé — durcissement du filet de sécurité et de test

- **`test/pkce-auth.test.js`** (nouveau) — `core/auth/pkce-auth.js` n'avait
  **aucun test** alors que c'est le module le plus sensible du dépôt (PKCE,
  échange OAuth, refresh, révocation, stockage chiffré du jeton). 26 cas :
  forme et non-réutilisation du verifier/challenge/state, construction de
  l'URL d'auth, succès/échec d'échange et de refresh (le détail d'erreur
  Google doit remonter), révocation best-effort (ne jette jamais), bornes
  d'expiration, aller-retour chiffré du token store, tolérance à une donnée
  corrompue.
- **`test/google-people.test.js`** (nouveau) — `core/api/google-people.js`
  n'avait aucun test alors qu'il porte le correctif read-merge-write : **le
  bug qui a déjà détruit des champs personnalisés utilisateur une fois**
  (une écriture GEO qui remplaçait tout le tableau `userDefined` au lieu de
  fusionner). Tests ciblés sur cet invariant précis + la reprise unique sur
  etag périmé + le découpage en tranches de 200.
- **`test/no-hardcoded-secrets.test.js`** (nouveau) — garde-fou anti-
  régression : aucun test ne protégeait le travail de sortie des secrets du
  code suivi (session S9-ter, voie γ). Scanne `core/ ui/ extension/ pwa/
  i18n/ scripts/` + `worker.js`/`wrangler.toml` pour le motif `GOCSPX-`
  (préfixe réel et stable d'un secret Google), en excluant explicitement
  `secrets.js` (gitignored, contient légitimement le vrai secret en local)
  et `secrets.example.js` (placeholder).
- **`scripts/check-smart-quotes.mjs`** + `npm run check:quotes` (nouveau,
  câblé dans le job `unit` de la CI) — garde-fou contre la régression
  concrète de l'incident S10 (guillemets typographiques cassant des appels
  `t('...')`, écran blanc en prod). Scanne `core/ ui/ extension/ pwa/` (hors
  `i18n/`, où les guillemets typographiques sont légitimes dans le texte
  traduit). Vérifié à zéro faux positif sur l'état actuel du code (grep
  préalable avant intégration).
- **`pwa/dev-server.js`** — durci : liaison explicite sur `localhost` (pas
  toutes les interfaces réseau par défaut) ; liste noire de chemins jamais
  servis même sous la racine du dépôt (`.git/`, `node_modules/`,
  `extension/background/secrets.js` et son exemple, `.env`, `scripts/`) en
  plus de la garde anti-traversée déjà présente. Reste un serveur dev-only,
  hors chemin de déploiement Cloudflare (non touché à ce niveau).

---

## 5. Non corrigé — délibérément laissé à l'opérateur

Ces points sont des recommandations réelles issues des revues, **non
exécutées** ici :

- **Refactors d'architecture** (`ui/orchestrator.js` trop volumineux et
  multi-responsabilité, mutex de refresh dupliqué entre `extension/
  background/auth-worker.js` et `pwa/platform-pwa.js`, helpers dupliqués
  dans `core/api/google-people.js`). Légitimes et de faible risque isolé,
  mais touchent la logique UI/auth **live** d'une app déjà packagée pour
  revue Chrome Web Store — mérite tes yeux avant merge, pas une exécution
  automatique en une passe.
- **`pwa/dev-server.js` — fallback `/api/oauth-config` en local.** Item déjà
  ouvert dans `TAF.md` depuis S9-ter : nécessite un choix d'architecture
  (où vit le secret PWA en dev local ?) qui t'appartient.
- **Désactiver les anciens `CLIENT_SECRET` côté Google Cloud Console** —
  action dans une console tierce, hors de portée d'un agent.
- **Re-tourner la suite E2E complète** (24 tests, dernier vert = S8) hors
  sandbox, sur ta machine — aucun outil à ma disposition ne peut le faire à
  ta place de façon fiable.
- **Offline réel** (§1) et **rendu visuel de la bascule FR/EN/ES post-i18n**
  (`[SUPPOSÉ]` depuis S10) — à éprouver visuellement.

---

## 6. Punch-list priorisée

| # | Action | Qui | Effort |
|---|---|---|---|
| ~~1~~ | ~~Lancer `npm test` + e2e pwa-headless~~ — **fait, voir §7** : 152/152 unit, 13/14 e2e (1 échec préexistant identifié) | — | — |
| 2 | Éprouver l'offline réel de la PWA (couper le réseau après 1ʳᵉ visite) | Ced | 5 min |
| 3 | Re-tourner l'E2E complet (24 tests, y compris `pwa-authenticated` et `extension`) hors sandbox, avant toute nouvelle soumission CWS | Ced | 15 min |
| 4 | Désactiver les anciens `CLIENT_SECRET` Google Cloud Console | Ced | 1 min |
| 5 | Décider de l'architecture `/api/oauth-config` en dev local (referme aussi l'échec e2e connu de `oauth-callback.spec.js`, §7) | Ced | réflexion |
| 6 | Refactors d'architecture (§5) — orchestrator.js, mutex de refresh, dédup google-people.js | session dédiée | 1-2 h |

---

## 7. Vérification — [VÉRIFIÉ] exécutée, pas seulement tracée

Cette revue s'est faite sans accès `bash` direct au dépôt réel (sandbox isolé
du poste de travail) — tous les fichiers ont été lus/édités via les outils de
fichiers, tests tracés manuellement contre l'implémentation réelle avant
d'être écrits. La vérification runtime elle-même a été déléguée à un
sous-agent avec accès shell réel au dépôt, qui a exécuté (et non simplement
relu) les commandes suivantes :

- `node --check` sur les 7 fichiers `.js` touchés/créés — **[VÉRIFIÉ]** aucune
  erreur de syntaxe.
- `npm run check:quotes` — **[VÉRIFIÉ]** passe, zéro faux positif.
- `npm test` — **[VÉRIFIÉ] 152/152 tests verts** (14 fichiers), dont les 32
  nouveaux tests (`pkce-auth.test.js` ×23, `google-people.test.js` ×6,
  `no-hardcoded-secrets.test.js` ×3). Aucun test préexistant cassé.
- `npx playwright test --project pwa-headless` — **[VÉRIFIÉ] 13/14 verts**,
  y compris `e2e/pwa/boot.spec.js` (le garde-fou « console propre au boot ») :
  l'enregistrement du service worker ajouté dans `pwa/app.js` ne déclenche
  aucun `console.warn` qui aurait fait échouer ce test — le risque identifié
  au moment du correctif (§1) ne s'est pas matérialisé.
- Un seul échec : `e2e/pwa/oauth-callback.spec.js`. **Investigué et prouvé
  préexistant, sans lien avec cette revue** — reproduit à l'identique sur un
  `git worktree` détaché de HEAD *avant* toute modification. Cause racine :
  `platform-pwa.js` (fichier non touché ici) appelle `/api/oauth-config`, un
  endpoint qui n'existe que côté Worker Cloudflare de prod, jamais dans
  `pwa/dev-server.js` — gap déjà connu et documenté comme item ouvert dans
  `TAF.md` (« Dev local : fallback `/api/oauth-config` dans
  `pwa/dev-server.js` »). Non corrigé ici (§5 — nécessite un choix
  d'architecture qui t'appartient), non aggravé.

La punch-list (§6) est mise à jour en conséquence : l'item 1 (lancer les
tests) est déjà fait, il ne reste que l'offline réel et le re-test E2E
complet (au-delà du seul projet `pwa-headless`) comme vérifications visuelles
qu'un agent ne peut pas faire à ta place.
