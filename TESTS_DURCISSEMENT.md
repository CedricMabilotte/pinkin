# Durcissement des bancs de tests — pinkin (2026-07-17)

Suite ciblée « tests » de la revue de durcissement du 2026-07-16
(`AUDIT_DURCISSEMENT.md`). Trois volets — stabiliser, systémiser, durcir —
plus une partie « réutilisable ailleurs ». Convention identique :
**[VÉRIFIÉ]** = exécuté réellement pendant cette session (commande lancée,
sortie lue), pas seulement tracé.

Changements **non commités** volontairement — revue opérateur avant commit.

---

## Partie 1 — Ce qui a été fait ici

### 1.1 Stabilisé

**`e2e/pwa/oauth-callback.spec.js` — corrigé, sans toucher à l'architecture
des secrets.** L'échec connu (préexistant, cf. AUDIT §7) venait du refactor
S9-ter : `handleCallback` commence par `getOAuthConfig()` →
`fetch('/api/oauth-config')`, endpoint qui n'existe que côté Worker
Cloudflare de prod — jamais dans `pwa/dev-server.js`. Le 404 faisait jeter
`OAUTH_CONFIG_FETCH_404` avant tout fetch Google ; le `.catch` de
`pwa/main.js` re-naviguait, et le test mourait au timeout (30,2 s constatées
en reproduction **[VÉRIFIÉ]** avant correctif). Correctif **au niveau du
test** : `page.route('**/api/oauth-config', …)` sert une config factice
(clientId/clientSecret bidons). La décision « où vit le secret en dev
local » reste entière côté opérateur (`TAF.md`, AUDIT §5) — rien n'a changé
dans `pwa/dev-server.js` ni `worker.js`.

Deux micro-flakiness éliminées au passage dans le même spec :
- le gel de la requête Google passait par `setTimeout(30 000)` puis
  `route.abort()` — un timer qui survivait à la page et générait un abort
  post-fermeture ; remplacé par une promesse jamais résolue (Playwright
  dispose les handlers à la fermeture) ;
- l'assertion « échange tenté » reposait sur un sleep fixe de 200 ms ;
  remplacée par `expect.poll(…, { timeout: 5_000 })` — plus rapide quand ça
  passe, plus tolérante sous charge.

**Revue de flakiness du reste de la suite** : `boot.spec.js`,
`navigation.spec.js`, `i18n.spec.js` sont sains (locators sur ID stables,
auto-wait Playwright, pas de sleeps, pas de dépendance d'ordre).
`carnet-fiche.spec.js` (authentifié) partage volontairement un contexte
entre tests (contrainte `launchPersistentContext`), état re-normalisé par
chaque test — laissé tel quel, rien de dangereux constaté à l'exécution.

**Projet `extension`** : non réparable depuis ce sandbox — contrainte
d'environnement documentée (`lecons-pinkin.md` L12, `TAF.md`), pas un bug.
**[VÉRIFIÉ]** que le sentinel auto-skip fonctionne proprement :
`npx playwright test --project extension` sans `PINKIN_EXT` → `1 skipped`,
exit 0, aucun échec bruyant.

### 1.2 Systémisé

**Deux helpers partagés extraits** (le coût de migration valait largement la
valeur : le mock Platform était dupliqué dans **cinq** fichiers, pas trois —
`pkce-auth`, `contacts-sync`, `crypto`, `geocoder`, `vcard-writer`) :

- `test/helpers/mock-platform.js` — `makeMemoryPlatform()`, la Platform en
  mémoire canonique. Deux usages documentés dans le fichier : injection par
  argument (crypto) et substitution de module via factory `vi.mock` async
  (les quatre autres). `_store` exposé pour le reset entre tests et
  l'inspection « au repos » (p. ex. jeton chiffré, pas en clair).
- `test/helpers/mock-fetch.js` — `jsonResponse()` (dupliqué à l'identique
  dans `pkce-auth` et `google-people`) + `mockFetchOnce()`.

Les cinq fichiers migrés ; les variantes locales supprimées. La seule
divergence réelle entre les copies (l'auth stubée de `vcard-writer`) est
posée par-dessus la fabrique, pas re-forkée.

**`test/README.md` (nouveau)** — convention de tests : les trois couches
(unit Node / dom happy-dom / e2e Playwright 3 projects) et quand utiliser
laquelle ; comment mocker Platform (les deux usages) ; comment mocker fetch ;
les garde-fous transverses ; et une section « Décisions déjà arbitrées — ne
pas corriger » qui fige noir sur blanc l'E2E-manuel-en-CI (L11/L12), le
`workers: 2`, et l'architecture du secret PWA — pour qu'un futur
contributeur ne les « répare » pas par erreur.

### 1.3 Durci

**Signal de couverture** : `npm run test:coverage` échouait —
`@vitest/coverage-v8` absent des devDependencies. Installé en `--no-save`
(package.json/package-lock **inchangés** ; l'ajout en devDependency est une
décision opérateur, recommandée). Signal exploitable **[VÉRIFIÉ]** :

- Avant : global 81,5 % stmts ; **`core/api/google-people.js` à 48 %**
  (31 % branches) — `fetchAllContacts`, `fetchSelfEmail`,
  `updateContactAddressAndGeo`, `batchRemoveGeo` entièrement nus, alors que
  trois de ces quatre chemins **écrivent ou lisent les données utilisateur**.
- La claim de la revue du 16/07 (« `contact-status` et `geocoder` moins
  denses en cas d'erreur ») s'est révélée **périmée à la re-vérification** :
  `geocoder.test.js` couvre déjà réponse vide, query nulle, erreur réseau
  transitoire, abort (93,9 % stmts) ; `contact-status` était à 100 % stmts.
  Conformément à la règle du projet, la couverture mesurée a primé sur la
  claim — l'effort est allé où le trou était réel.

**13 tests ajoutés** (152 → 165), ciblés invariants métier :
- `fetchAllContacts` ×5 — pagination (contrat de complétude de la sync : un
  pageToken ignoré = perte silencieuse au-delà de 100 contacts), compte
  vide, 401 → `AUTH_EXPIRED`, 403 avec corps Google diagnosticable, jeton en
  en-tête jamais en URL.
- `fetchSelfEmail` ×2 — primaire préféré, repli, null.
- `updateContactAddressAndGeo` ×2 — le read-merge-write à DEUX champs :
  adresse corrigée en tête en champs structurés seuls (sans `formattedValue`
  ni `metadata`), autres adresses préservées, champ custom étranger à Pinkin
  préservé, GEO fusionné ; + retry unique sur etag périmé.
- `batchRemoveGeo` ×3 — la réversibilité D1 : retire GEO en préservant les
  autres champs custom (miroir exact du bug historique qui avait détruit des
  données utilisateur), contact disparu compté `failed` sans bloquer,
  échec réseau → décompte cohérent sans exception.
- `contact-status` ×1 — objet sans propriété `addresses` (branche `?? 0`).

Après : global **91 %** stmts / 93,7 % lignes ; `google-people.js` **90,9 %**
stmts / 97,2 % lignes. Restes assumés : `core/platform.js` (adaptateur
d'environnement, couvert par l'E2E) et les modules UI non importés en unit
(`orchestrator`/`shell`/`contact-panel` — leur testabilité unitaire passe
par le refactor déjà en punch-list AUDIT §6 item 6, hors scope ici).

### 1.4 Preuves d'exécution **[VÉRIFIÉ]**

Toutes commandes exécutées sur le dépôt réel pendant cette session :

| Commande | Résultat |
|---|---|
| `npm test` (après migration helpers + ajouts) | **165/165 verts**, 14 fichiers, 1,2 s |
| `npx playwright test --project pwa-headless` | **14/14 verts**, 8,0 s (dont oauth-callback corrigé : 0,9 s au lieu d'un timeout 30 s) |
| `npx playwright test --project pwa-authenticated` | **10/10 verts**, 7,8 s (profil OAuth opérateur toujours valide) |
| `npx playwright test --project extension` (sans `PINKIN_EXT`) | 1 skipped, exit 0 — sentinel propre |
| `npm run test:coverage` | 91 % stmts global (détail ci-dessus) |
| `npm run check:quotes` | passe — aucun guillemet typographique introduit |

Soit **189 tests verts + 1 skip volontaire**. Non couvert par cette session :
le project `extension` en exécution réelle (contrainte sandbox, L12 — à
re-tenter côté opérateur, item déjà au `TAF.md`).

### 1.5 Décisions laissées à l'opérateur

- Ajouter `@vitest/coverage-v8` aux devDependencies (installé ici en
  `--no-save` seulement, pour ne pas modifier package.json sans toi).
- L'item `TAF.md` « fallback `/api/oauth-config` en dev local » reste
  ouvert : le correctif de test le contourne pour l'E2E, mais
  `npm run dev:pwa` ne peut toujours pas dérouler un OAuth réel en local.
- Commit des changements (8 fichiers modifiés, 3 créés) — rien n'a été
  commité.

---

## Partie 2 — Ce qui est réutilisable pour un futur projet JS/Node

### Copiable fichier par fichier (ou quasi)

- **`vitest.config.js` — pattern dual-projects node + happy-dom.** La clé
  `projects` segmente par environnement sur un simple pattern de chemin
  (`test/**` = Node, `test/dom/**` = happy-dom) : un seul `npm test`, le bon
  environnement par fichier, zéro config par test. Copiable tel quel pour
  tout projet vanilla JS avec une part d'UI ; seule la liste `exclude`
  est à adapter.
- **`test/helpers/mock-fetch.js`** — copiable tel quel : rien de spécifique
  à pinkin. Le principe « réponse minimale, on étend le contrat dans le
  helper quand le code de prod lit un membre de plus » est la partie qui
  vaut d'être conservée.
- **`scripts/check-smart-quotes.mjs` + `npm run check:quotes`** — copiable
  tel quel ; seules les listes de dossiers scannés/exclus changent. Garde-fou
  né d'un incident réel (L19 : guillemets typographiques substitués par un
  outil d'édition dans des délimiteurs JS → écran blanc en prod). Vaut pour
  tout projet où un agent édite du code : la classe d'erreur est propre aux
  outils d'édition, pas à pinkin. (Déjà généralisé aux repos de sites via la
  recommandation R6 du 16/07.)
- **`test/no-hardcoded-secrets.test.js`** — le squelette (scan récursif du
  code suivi, liste d'exclusions explicite pour les fichiers gitignorés
  légitimes) est copiable ; le motif scanné (`GOCSPX-`) est à remplacer par
  les préfixes de secrets du projet (ce qui rend le garde-fou fort, c'est de
  scanner un préfixe RÉEL et stable de l'émetteur, pas un motif générique).
- **Le sentinel auto-skip** (`e2e/extension/load.spec.js`, 3 lignes :
  `test.skip(!process.env.FLAG, 'message qui dit comment activer')`) —
  pattern trivial mais précieux : une suite dépendante d'un environnement
  lourd n'échoue jamais bruyamment, elle s'auto-documente.

### Réutilisable comme pattern (à ré-instancier, pas à copier)

- **Convention « Platform injectable » + mock mémoire.** Le vrai
  réutilisable n'est pas `mock-platform.js` (son contrat get/set/del,
  `set(key, null)` = delete, est propre à pinkin) mais le **découpage** qui
  le rend possible : tout accès à l'environnement (storage, auth) passe par
  un objet-plateforme unique, injecté par argument quand c'est possible,
  importé d'un module unique sinon. Un module métier ne touche jamais
  `localStorage`/`chrome.storage` directement → toute la logique se teste
  sous Node avec une Map. Pour un futur projet : définir l'interface
  plateforme au jour 1, le helper de mock en découle en 20 lignes. Le duo de
  recettes (injection par argument / `vi.mock` avec factory async — la
  subtilité du hissage Vitest est documentée dans le helper) se transpose
  tel quel.
- **Séparation CI unit-auto / E2E-manuel, avec sa justification écrite.**
  Le pattern : couche unit/dom rapide (~1 s) sur chaque push ; E2E en
  `workflow_dispatch` uniquement, parce que la flakiness des runners
  mutualisés (L11 : saturation du dev-server mono-threadé au-delà de 2
  workers ; L12 : fenêtres d'exécution contraintes) coûte plus en faux
  rouges qu'elle ne rapporte en détection. Le transférable n'est pas la
  décision (chaque projet re-mesure) mais la **discipline** : quand on
  déroge au dogme « E2E partout en CI », l'écrire DANS le workflow ET dans
  la doc de convention, sinon chaque nouvel arrivant (humain ou agent) la
  « répare ».
- **Mock d'endpoint prod-only par interception réseau E2E.** Quand un
  endpoint n'existe que dans l'infra de prod (ici `/api/oauth-config` côté
  Worker), le test E2E le sert par `page.route()` plutôt que d'introduire un
  fallback dev dans le code applicatif : le correctif reste dans le
  périmètre du test, l'architecture reste intacte, et la décision
  d'architecture reste ouverte. Généralisable à tout projet dont le dev
  local ne réplique pas l'edge (Workers, functions, API gateways).
- **Le rapport de couverture comme arbitre des claims.** Deux fois de suite
  (16/07 puis ici), une claim de sous-agent ou de revue sur « ce qui est
  sous-testé » s'est révélée partiellement fausse ; les deux fois, c'est un
  outil (grep, puis coverage v8) qui a tranché en minutes. Pattern :
  ne jamais prioriser un effort de test sur une claim non re-mesurée.

### Trop spécifique à pinkin pour être généralisé

- Les tests d'invariants métier eux-mêmes (read-merge-write People API,
  seuil `MIN_PLACE_RANK`, mémoire des échecs Nominatim, parité i18n
  fr/en/es) — la *méthode* (tester l'invariant qui a déjà cassé des données
  réelles, au niveau du corps de requête envoyé) se transpose, pas les tests.
- Le profil OAuth persistant (`oauth:capture` + `launchPersistentContext`,
  un seul fichier spec, un worker) — réponse à un blocage précis de Google
  (« navigateur non sécurisé » sur storageState) ; ne le répliquer que face
  au même mur.
- Les nombres magiques calibrés (workers: 2, timeout 10 s d'expect, TTL
  cache 10 min) — tous issus de mesures locales (L11), à re-mesurer ailleurs.
