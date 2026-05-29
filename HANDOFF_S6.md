# HANDOFF — Session #6 : automatisation des tests, infra réutilisable

> **Note d'amendement.** Ce handoff a été suivi d'une **rallonge méthodologique**
> qui a élargi le travail au-delà de la portée initiale de #6. Voir
> `HANDOFF_S7.md` pour le delta couvert (critique + traitement en masse en 7
> lots, i18n bootstrap, refactor minimal, extension MV3 sentinel). À lire
> APRÈS ce fichier.
>
> Mise à jour [VÉRIFIÉ] : l'**import .vcf de bout en bout** (R4 #7,
> opérateur) — auparavant `[SUPPOSÉ]` hérité de #3, **désormais éprouvé en
> runtime**.

Dernier point de reprise. La session #7 lit `BRIEF_PINKIN.md`, puis `HANDOFF_S5.md`,
puis ce fichier. À lire en complément : `PLAN_TESTS_V0.2.md` (neuf de cette
session), `TEST_V0.2.md`, `PLAN_PHASE_E.md`.

Convention maintenue depuis #2 : **[VÉRIFIÉ]** = constaté à l'exécution
(opérateur ou contrôle automatique) ; **[SUPPOSÉ]** = correct sur lecture du
code et contrôle de syntaxe, pas éprouvé en runtime.

---

## Où en est le produit

Le code de la V0.2 n'a pas bougé. **Ce qui a changé, c'est qu'on peut désormais
prouver qu'il marche** : 93 tests automatisés (84 unit/DOM + 9 E2E PWA) là où
il n'y en avait que 36 unit fin #5. La validation visuelle des pistes P1 et P3
de la refonte d'interactions a été faite pour la première fois, en pilotant
Chrome directement.

V0.2 reste à éprouver côté **authentifié** (Carnet, Fiche, écriture réelle) :
ça demande un flux OAuth Google une fois, capturé en storageState Playwright.
Pas faisable côté sandbox — c'est l'unique vraie tâche pour #7 avant la mise
en magasin.

## Le fil de la session

Départ : « automatisation des tests pour validation vers V1 » — demande de mettre
en place une **configuration pro et réutilisable** (les autres projets : freechi,
troisiemesvoix, goorg, igor) qui permette à Claude de tester un maximum
lui-même. Critère de sortie choisi : **B** (« la suite prouve effectivement que
ça marche », pas seulement filet anti-régression).

Qualification de stack (en texte, conformément à L2) : Vitest pour remplacer
`node:test` (apporte DOM, coverage, watch, mocks dans un seul écosystème ré-
employable), happy-dom pour le DOM léger, Playwright pour l'E2E (seul outil
sérieux pour les extensions MV3, sait persister `storageState`), GitHub Actions
pour la CI. Tout générique — zéro logique Pinkin.

Constats autonomes (L8) : le sandbox bash voit `http://localhost:3000` en
direct, et `google-chrome` est installé système — donc Playwright peut tourner
en local sans télécharger Chromium, et l'opérateur n'a pas eu à lancer plus
que `npm run dev:pwa` qu'il avait déjà allumé.

Vint l'installation, la migration (36 → 84), le premier E2E (puis 8 autres),
la CI, l'élargissement de couverture (`geocoder`, `vcard-writer`, `carnet`),
puis l'appairage de Claude in Chrome pour la validation visuelle de P1/P3.

## La récolte, par niveaux

### Niveau produit

**Fruit.** P1 (popover d'écriture ancré sous le bouton d'en-tête) et P3
(popover de déconnexion in-app remplaçant le `confirm()` natif) ont été
ÉPROUVÉS pour la première fois dans Chrome. Ils marchent : ouverture nette,
copie cohérente, ancrage, fermeture propre. Console muette pendant les
interactions.

**Observation à arbitrer.** Les deux popovers s'ouvrent AVANT authentification.
Pour P3 c'est anodin (le bouton existe en permanence). Pour P1 c'est plus
surprenant : un utilisateur qui n'a même pas connecté Google voit une invite à
« autoriser l'écriture ». Voulu, ou à conditionner à `hasToken` ? À trancher en #7.

**Toujours non éprouvés** (héritages #3/#5 — auth requise) : `mailto`, import
`.vcf`, SMS/WhatsApp, P2 (opt-in depuis la Fiche), P4 (focus trap), tout le
parcours Carnet authentifié.

### Niveau architecture & code

**Fruit majeur.** Infra de test livrée, **réutilisable telle quelle** par les
autres projets web du workspace agents :
- `vitest.config.js` — deux projects `unit` (Node) / `dom` (happy-dom),
  cohabitation par pattern.
- `playwright.config.js` — basculage automatique Chrome système (local) /
  chromium téléchargé (CI), `webServer` qui démarre `dev:pwa` à la demande
  (en local : `reuseExistingServer: true`).
- `.github/workflows/tests.yml` — deux jobs parallèles (unit, e2e), upload du
  rapport HTML en artifact toujours (succès comme échec, 14 j).
- 9 scripts npm cohérents (`test`, `test:watch`, `test:ui`, `test:coverage`,
  `test:e2e`, `test:e2e:ui`, `test:e2e:report`, `test:all`, `dev:pwa`).

**Couverture ajoutée.**
- `geocoder` (15 tests) — applyGeoCache écarte les échecs (jamais de marqueur
  fantôme), pendingGeocodes implémente la mémoire d'échecs liée à la query,
  runIncrementalGeocoding persiste après chaque contact, erreur transitoire
  NON mémorisée. **Le cœur de la session #3 est protégé.**
- `vcard-writer` (18 tests) — `isConfidentEnough` au seuil MIN_PLACE_RANK=13
  (mesure #3), `publishGeoCache` n'inclut PAS les échecs dans `skipped`
  (correctif #3), `correctContactAddress` sans garde-fou de confiance
  (intention explicite). **Le seuil V0.2 est protégé.**
- `carnet.js` (15 tests en happy-dom) — premier test du projet `dom`,
  valide la chaîne Vitest + happy-dom. Filtres / recherche / tri français /
  plafond CAP / activation clavier (l'accessibilité saluée dans AUDIT_INTERACTIONS.md).
- `boot.spec.js` + `navigation.spec.js` (9 E2E) — boot sans erreur console,
  écran d'accueil, manifeste 200 (régression du bug #5 fermée), contrat
  d'identifiants de `shell.js` (les ID stables existent au montage), assets
  servis, robustesse au clic à vide.

**Tension non résolue.** `ui/orchestrator.js` (633 l, 1 fn exportée) écarté du
test unit motivement : refactor exigé pour exposer ses fonctions internes, ROI
faible. Ses comportements visibles sont mieux couverts en E2E — partiellement
fait en #6 (sans auth), à compléter en #7 (avec storageState).

**Dette mineure.** `contacts-sync.js` non couvert (faible valeur, délégation à
google-people.js déjà mocké). `core/crypto.js` (WebCrypto), `platform-*.js`
(Chrome/OAuth) non couverts (couplés au navigateur, ROI faible).

### Niveau méthode

**Fruit.** Vérifs autonomes (L8 effectif) : avant de demander quoi que ce soit
à l'opérateur, j'ai testé l'accès réseau du sandbox vers `localhost`, vérifié
la dispo de `google-chrome` système, et lu les vrais ID du shell quand un
locator a échoué (au lieu de deviner).

**Leçon (proposée) — L10.** `Edit` a échoué silencieusement quand un linter a
modifié le fichier entre `Read` et `Edit` (cas vécu sur `package.json` : le
script `test` est resté `node --test` au lieu de devenir `vitest run` ; j'ai
diagnostiqué après coup quand `npm test` plantait sur des imports vitest dans
des tests lancés par `node --test`).

Verdict proposé : **garde-fou** — traiter chaque retour de `Edit` comme une
assertion à lire ; en cas d'erreur (« file modified »), re-Read puis re-Edit
plutôt que filer ; et si un comportement de test ne s'aligne pas avec un edit
qu'on croit fait, premier réflexe : `cat` ou `git diff` pour vérifier que la
modif est bien là. Cf. `lecons-pinkin.md` §L10.

### Niveau stratégique

**Choix tenu.** Stack Vitest + Playwright + GitHub Actions choisie pour sa
RÉUTILISABILITÉ hors Pinkin (les autres projets web). C'est l'optimisation
correcte de la demande explicite de l'opérateur : « un environnement pro qui
sera réutilisable dans mes projets divers ». Tous les fichiers de config sont
copiables tels quels — seul `playwright.config.js`'s `baseURL` + `webServer.
command` sont à adapter au projet cible.

**Décision écartée.** Tester `ui/orchestrator.js` en happy-dom — refactor pour
exposer les fonctions internes était disproportionné. Les comportements visibles
de l'orchestrateur passent par l'E2E. C'est cohérent avec le critère B (prouver
que ça marche **dans le contexte réel d'exécution**, pas en isolation
artificielle).

### Niveau méta

**Outil neuf et fertile.** Claude in Chrome appairé en cours de session
(extension installée par l'opérateur). Le couple Playwright (scripté,
reproductible) + Claude in Chrome (interactif, libre) couvre maintenant les
deux usages distincts : preuve par script et exploration visuelle. Tu peux me
donner « regarde le popover d'écriture en vrai » et j'y vais.

**Contraintes maintenues.** L2 (pas de widget inline, pas de questions à choix
multiple — questions en texte). L9 (sandbox bash sans persistance de
processus — résolu par `webServer: reuseExistingServer` de Playwright).

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ]** : arbre git propre ; 3 commits #6 poussés sur `origin/main` ;
`npm test` 84/84 ; `npx playwright test` 9/9 ; ESM imports valides
(`node --check` ne tourne plus — remplacé par vitest qui charge le code) ;
P1 et P3 visuellement OK dans Chrome (Claude in Chrome) ; console muette au
boot et pendant les interactions de popovers ; CI workflow YAML valide ;
PWA `localhost:3000` accessible depuis le sandbox (vérifié par `curl` et par
Playwright).

**[SUPPOSÉ]** — à éprouver en #7 :
- **scénarios authentifiés** PWA (Carnet réel, Fiche réelle, écriture réelle,
  retrait, déconnexion réelle) — non couverts ;
- **P2** (opt-in écriture depuis Fiche) et **P4** (focus trap fiche) — exigent
  auth ;
- **`mailto`, import `.vcf`, SMS/WhatsApp** — points hérités #3 ;
- **Extension MV3** : la chaîne de tests E2E est faite pour la PWA, l'extension
  MV3 demanderait un projet Playwright supplémentaire (`--load-extension`, mode
  headed avec display X) ;
- **CI verte** — workflow prêt, **déclenchera au prochain push**. À surveiller
  au premier run.

## Décisions en attente / portes ouvertes pour #7

- **OAuth via `storageState` Playwright** (task #10, ouvert depuis #6). Geste :
  `npx playwright codegen http://localhost:3000`, faire le flux Google une
  fois, enregistrer `e2e/.auth/storageState.json` (déjà gitignored). Tous les
  tests « authenticated » repartent connectés ensuite. **C'est le seul vrai
  verrou avant la mise en magasin**.
- **P1 popover avant auth** — voulu ou bug ? Si voulu : le documenter ; si
  bug : conditionner à `hasToken`. Mineur.
- **Extension MV3 en E2E** — projet Playwright supplémentaire à activer si on
  veut éprouver A→E de TEST_V0.2.md sans intervention humaine.
- **Tests visuels** (Playwright `toHaveScreenshot`) — non posés ; à arbitrer
  uniquement si une régression visuelle est identifiée.
- **Repris de #5, clos** : Claude in Chrome appairé (#6). Délégation L8 : a
  bien tenu cette session (Claude a vérifié sandbox/Chrome/IDs lui-même).
- **L10** (leçon #6) — garde-fou proposé, à arbitrer dans `lecons-pinkin.md`.

Tous les autres points en suspens de #5 restent ouverts à l'identique :
mailto/.vcf/SMS hérités #3 ; Phase E magasin ; `/privacy` et `/terms` ;
gestion de relation ; multi-carnets ; README §1.

## Pour démarrer la session #7

Lire `BRIEF_PINKIN.md`, `HANDOFF_S5.md`, ce fichier, puis `PLAN_TESTS_V0.2.md`
et `PLAN_PHASE_E.md`. Relire `lecons-pinkin.md`. Première action utile :
établir le `storageState` Playwright (task #10) — c'est ça qui débloque la
partie « authenticated » du critère B. Une fois fait, tous les scénarios
TEST_V0.2.md restants (Carnet, Fiche, écriture, retrait) peuvent passer en
automatique. Ne pas traiter un `[SUPPOSÉ]` comme acquis.
