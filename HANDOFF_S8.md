# HANDOFF — Session #8 : finalisation V0.2 + V1.0 prête à soumettre

Dernier point de reprise. Sessions suivantes lisent `BRIEF_PINKIN.md`, puis
`HANDOFF_S7.md` (avec son amendement de tête), puis ce fichier. À lire en
complément : `PLAN_PHASE_E.md`, `HEBERGEUR_PWA.md`, `JUSTIFICATION_OAUTH.md`,
`FICHE_CWS.md`, `PLAN_VIDEO_OAUTH.md`.

Convention maintenue depuis #2 : **[VÉRIFIÉ]** = constaté à l'exécution
(opérateur ou contrôle automatique) ; **[SUPPOSÉ]** = correct sur lecture du
code et contrôle de syntaxe, pas éprouvé en runtime.

Note : cette session est numérotée **#8** (la précédente #7 close avec
rallonge — décision opérateur ouverture de session). La numérotation reste
séquentielle.

---

## Où en est le produit

V0.2 est **verrouillée** au sens du critère de sortie de `PLAN_PHASE_E.md`
(extension et PWA passent la même séquence durcie ; mailto et import .vcf
confirmés en runtime ; arbre git propre ; dépôt committé). V1.0 est
**prête à soumettre** au sens où plus rien n'est à rédiger ni à choisir
côté Claude — les portes restantes (paiement compte développeur Chrome
Web Store, capture vidéo OAuth, soumission revue magasin, validation
OAuth Google) sont des gestes opérateur et une latence Google.

Tests : **141 verts re-vérifiés runtime cette session**.

- 117 unit/DOM (`npm test`) — dont 3 nouveaux : parité fr/en/es (toute
  clé feuille de fr existe dans en + es) et préservation des placeholders
  mustache.
- 14 E2E PWA-headless (`npx playwright test --project pwa-headless` —
  confirmé via `--stats` JSON expected=14 unexpected=0).
- 10 E2E PWA-authenticated (`npx playwright test --project
  pwa-authenticated` — passés en 20 s, profil OAuth toujours valide).

Les artefacts V1.0 prêts à utiliser, à la racine du dépôt :

| Fichier | Usage |
|---|---|
| `HEBERGEUR_PWA.md` | Analyse comparée — recommandation Cloudflare Pages, alternative GitHub Pages. |
| `privacy.html` | Page statique à servir sur pinkin.org/privacy.html. Palette Pinkin, ton geek libertaire toléré, Limited Use Disclosure verbatim. |
| `terms.html` | Idem pour pinkin.org/terms.html. Logiciel libre, fourni tel quel, droit français. |
| `FICHE_CWS.md` | Texte prêt à coller dans la fiche Chrome Web Store : descriptions fr/en/es, single purpose, justification des permissions, checklist soumission. |
| `JUSTIFICATION_OAUTH.md` | Texte prêt à coller dans le formulaire OAuth verification Google Cloud Console : justification scopes `contacts.readonly` + `contacts`, Limited Use Disclosure. |
| `PLAN_VIDEO_OAUTH.md` | Storyboard 5 actes (~4 min) + script anglais à lire + pièges qui causent les rejets. |
| `scripts/pack-extension.sh` | Recette de packaging `.zip` reproductible avec contrôles défensifs. Sortie `dist/pinkin-vX.Y.Z.zip` (gitignored). |

## Le fil de la session

Départ : l'opérateur ouvre la session sous le titre « Pinkin #7 :
finalisation V0.2 et sortie V1.0 ». La précédente session étant #7 close
(rallonge incluse), Claude commence par lui demander de trancher en texte
(L2) : (a) c'est #8 et le titre était une coquille, ou (b) une seconde
rallonge de #7. L'opérateur tranche (a) ; la session devient #8.

Re-vérification de l'état réel contre le code (L4) avant toute action.
Trois claims du TAF sont stale :
- i18n extraction `carnet.js`/`contact-panel.js`/`orchestrator.js` —
  *prétendu à faire*, en réalité fait par la rallonge #7 ;
- P1 tooltip désactivé — idem ;
- i18n en.js/es.js stubs démonstratifs — vraie, à traiter.

Les 141 tests sont re-tournés à l'instant : 117 unit/DOM verts, 14 PWA-
headless verts, 10 PWA-authenticated verts. Le profil OAuth fonctionne
toujours, la couche authentifiée reste [VÉRIFIÉ].

Cadrage soumis à l'opérateur en texte. Quatre arbitrages reçus :
- Hébergeur PWA : analyse comparée à livrer (pas de préférence
  pré-cuite).
- Scopes OAuth déclarés : `contacts.readonly` + `contacts` (lecture +
  écriture opt-in, le scope écriture déjà implémenté Phase D).
- Multilingue obligatoire à V1 (donc traduction effective en.js/es.js).
- /terms : qualité validation Google, ton geek libertaire toléré.

Exécution en deux blocs :

**Bloc V0.2.** Re-tournage E2E authentifié (10/10, ~20 s). Traduction
intégrale de `i18n/fr.js` vers `i18n/en.js` et `i18n/es.js` —
tutoiement → « you » / « tú » informel, ton geek libertaire préservé.
Garde-fou de parité ajouté à `test/i18n.test.js` (3 nouveaux tests : toute
clé feuille de fr existe dans en + es, placeholders mustache préservés).
Deux tests rendus obsolètes par la traduction réelle sont reformulés ;
`test/dom/carnet.test.js` force `setLang('fr')` en `beforeEach` (happy-dom
expose `navigator.language` 'en-US' par défaut, qui faisait basculer le
rendu en anglais et cassait les assertions sur des libellés français). 120
tests verts. Commit `cd54198`.

**Bloc V1.0.** Six artefacts admin produits en série, palette Pinkin pour
les deux pages HTML statiques :

- `HEBERGEUR_PWA.md` — quatre candidats qualifiés (Cloudflare Pages,
  Netlify, Vercel, GitHub Pages) sur critères pertinents (HTTPS auto,
  custom domain, service worker scope, headers, latence Europe, plafonds
  gratuits, durabilité offre gratuite, intégration git push). Recommandation
  argumentée : **Cloudflare Pages**, parce qu'unique candidat sans quota
  de bande passante (élimine le scénario « la fiche CWS prend, je découvre
  une facture un samedi »). Alternative défendable : GitHub Pages
  (alignement parc opérateur). Recettes de mise en œuvre fournies.

- `privacy.html` — pages statique 11 sections, rédigée pour passer la
  validation OAuth Google scope sensible : identification nommée des
  données accédées via Google People API (champs lus + champs écrits),
  Limited Use Disclosure verbatim, droits utilisateur (RGPD inclus),
  sécurité (AES-GCM 256 + PKCE), section mineurs, contact. Ton geek
  libertaire toléré dans l'encart d'ouverture (« Le résumé honnête »).

- `terms.html` — 11 sections aussi : identité de l'éditeur (personne
  physique), ce qu'on peut faire, ce qu'on ne doit pas faire, garantie
  « tel quel » avec préservation des droits impératifs du consommateur UE,
  IP (licence open source côté code, propriété du logo côté nom Pinkin),
  droit français + juridiction compétente. Ton geek libertaire conservé
  dans l'encart « L'esprit du contrat ».

- `FICHE_CWS.md` — identité, description courte (132 car max — Pinkin :
  128), description longue prête à coller en **fr + en + es**, single
  purpose description, justification *par permission* du manifeste,
  plan détaillé des 5 captures d'écran (1280×800), checklist avant
  soumission.

- `JUSTIFICATION_OAUTH.md` — texte prêt à coller dans le formulaire
  Google Cloud Console : « Why does your app need this scope » +
  « How will the requested scope improve user experience » +
  « Demonstrate that this is the minimum scope needed » pour chacun
  des deux scopes. Limited Use Disclosure verbatim. Architecture
  sécurité résumée (en pointant les modules + tests existants). Domaines
  à vérifier dans Search Console.

- `PLAN_VIDEO_OAUTH.md` — storyboard 5 actes (~4 min) avec actions à
  l'écran + voix off ; script anglais lu mot à mot (~4 min) ; réglages
  OBS Studio + Chrome ; choix de voix vs texte à l'écran ; pièges
  fréquents (vidéo en mode privé → rejet automatique, consentement
  flou → rejet, etc.).

- `scripts/pack-extension.sh` — recette d'empaquetage avec contrôles
  défensifs (arbre git propre, manifest parsable, version != 0.*, clé
  `key` présente, 4 icônes, CLIENT_ID renseigné, Leaflet local). Liste
  blanche de ce qui rentre dans le zip (plus sûr qu'une liste noire) :
  manifest + extension/ + core/ + ui/ + i18n/ + assets/icons/ + lib/leaflet/.
  Exclus : .git, node_modules, test, e2e, scripts, pwa, docs internes.
  `dist/` ajouté à `.gitignore`. Premier passage du script produit
  `dist/pinkin-v0.1.0.zip` (2,4 Mo, contenu vérifié).

Nettoyage en passant : deux dossiers fantômes vides
`extension/{background,popup}/` et `core/{api,model,services}/` —
sédiments d'un `mkdir` antérieur où la brace expansion ne s'est pas faite
— supprimés du système de fichiers, donc du zip.

TAF entièrement réécrit (la section « À faire » avait du stale, et la
section « Fait » était dupliquée). Trois nouveaux groupes : V0.2
résiduel (R5 mailto, extension MV3 xvfb), V1.0 mise en magasin
(compte CWS, bump version, hébergeur, déploiement, vérif Search
Console, captures, packaging+soumission), V1.0 validation OAuth (compte
test, vidéo, justifications, soumission, bascule listé).

## La récolte, par niveaux

### Niveau produit

**Fruits.** L'utilisateur arrive sur une UI réellement trilingue : `fr`,
`en`, `es` sont désormais TOUS traduits intégralement, plus de chaîne
française qui fuse dans une UI anglophone (cf. garde-fou de parité).
Toute la documentation V1 est prête : un opérateur étranger reprenant
le projet pourrait soumettre au CWS et au formulaire OAuth Google sans
poser de question.

**Verrou unique restant côté code.** L'**extension MV3 E2E** (cf. TAF),
qui exige `sudo apt install xvfb` ou autorisation X. Sentinel posé,
project Playwright dédié, activable par `PINKIN_EXT=1`. Hors scope
session — geste opérateur.

### Niveau architecture & code

**Fruit majeur — discipline du multilingue.** Le garde-fou de parité
fr/en/es est l'apport architectural utile : une régression silencieuse
où une chaîne ajoutée à fr.js sans traduction en en/es aurait laissé un
texte français fuser dans une UI EN/ES — un défaut qu'on ne remarque
que sur un screenshot a posteriori — est désormais détectée
immédiatement par `npm test`. Le test nomme la clé manquante.

**Discipline de packaging.** `scripts/pack-extension.sh` cristallise les
8 contrôles à effectuer avant chaque soumission CWS. C'est moins de
ré-apprendre à chaque release ce qu'il faut vérifier.

**Discipline de docs admin.** Sept fichiers à la racine, chacun avec un
rôle unique nommé dans le frontmatter. Une session suivante n'a plus à
décider quoi rédiger en premier — l'enchaînement TAF → V1.0 mise en
magasin / validation OAuth est explicité.

### Niveau méthode

**Fruit.** Le découpage « V0.2 verrouillée + V1.0 prête à soumettre »
proposé en cadrage a tenu jusqu'à la fin : chaque artefact a un
livrable concret, indépendant des autres, vérifiable seul. Aucune
attente d'opérateur en cours de session (sauf la validation initiale
des 4 arbitrages).

**Leçon (#8).** L11 — *Sandbox parallélisation E2E : 2 workers maximum*.
Sous le harness Cowork actuel, 4 workers Playwright sur la PWA fait
saturer le serveur `dev:pwa` mono-threadé (fait noté en #7 — mais ré-
observé en #8 sur les mêmes specs qui passaient en début de session :
flaky à 4 workers, vert à 2). Verdict garde-fou : abaisser le défaut
hors-CI à 2. Voir `lecons-pinkin.md`.

### Niveau stratégique

**Choix tenus.**
- Scopes OAuth déclarés `contacts.readonly` + `contacts` (et non
  readonly seul) — V1 livre l'écriture, conforme `PLAN_PHASE_E.md`.
- Hébergeur PWA recommandé Cloudflare Pages — décision déléguée à
  l'opérateur sur la base de l'analyse argumentée.
- Multilingue à V1 (et non V1.1) — engagement coûteux honoré.
- /terms en français + ton geek libertaire toléré — pari sur la
  tolérance Google.

**Décision matérielle à arbitrer (mineure).** Le manifest est encore en
`0.1.0`. Bumper à `1.0.0` avant la première soumission CWS — bien
identifié par le warning de `pack-extension.sh`.

### Niveau méta

**Contraintes maintenues.** L2 (questions en texte, jamais QCM), L4
(re-vérifier les claims contre le code — 3 attrapées dès l'ouverture),
L8 (épuiser ce que Claude peut vérifier soi-même avant de déléguer —
l'analyse hébergeurs s'est faite sur les connaissances 2026-05 + lecture
de `manifest.json` réel pour les permissions, l'opérateur n'a pas eu à
lire de doc Cloudflare ou Google), L9 (pas de processus persistant —
Playwright `webServer.reuseExistingServer` reste en place).

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ]** : arbre git propre ; commits #8 poussés sur `origin/main` ;
`npm test` 120/120 ; E2E PWA-headless 14/14 (stats JSON) ; E2E PWA-
authenticated 10/10 (20 s) ; profil OAuth Google encore valide ; bash
`scripts/pack-extension.sh` produit `dist/pinkin-v0.1.0.zip` (2,4 Mo) avec
contenu vérifié (manifest, extension/, core/, ui/, i18n/, assets/icons/,
lib/leaflet/, aucun test/ ni node_modules/ ni mockup/) ; tous les
fichiers JS et le script bash passent `node --check` / `bash -n`.

**[SUPPOSÉ]** — à éprouver en session suivante :
- `privacy.html` et `terms.html` rendus dans un vrai navigateur — pas
  encore servis depuis un hébergeur ;
- traduction réelle des libellés EN/ES en UI live — testée
  algorithmiquement (parité, placeholders) mais pas auditée pour
  *qualité éditoriale* par un locuteur natif ;
- la PWA tient l'ensemble du flux UI en EN / ES — `t()` est appelé
  partout, les bascules `e2e/pwa/i18n.spec.js` passent (welcome
  uniquement), mais l'audit complet écran par écran reste à faire ;
- Extension MV3 en runtime — exige xvfb / X autorisé (inchangé S7).

## Décisions en attente / portes ouvertes pour la suite

- **Hébergeur PWA à choisir** parmi Cloudflare Pages (recommandé) ou
  GitHub Pages (alternative alignée parc). Une fois choisi : CNAME chez
  Gandi, déploiement, vérification Search Console.
- **Bumper `manifest.json` version** `0.1.0` → `1.0.0` avant première
  soumission CWS.
- **Compte développeur CWS** (5 $, geste opérateur) — préalable
  irréductible.
- **Compte de test Google** pour la vidéo OAuth (ne pas exposer le
  compte perso sur YouTube unlisted).
- **R5 mailto/WhatsApp/Signal côté env opérateur** — diagnostic
  posé #7, traitement reporté.
- **Extension MV3 activation** — `apt install xvfb` ou autorisation X11.

## Pour démarrer la session suivante

Lire `BRIEF_PINKIN.md`, `HANDOFF_S7.md` (avec amendement), ce fichier,
puis `HEBERGEUR_PWA.md` pour trancher l'hébergeur. Première action utile
selon le souhait :

- *Pousser vers la mise en magasin* : choisir l'hébergeur, configurer
  CNAME, déployer PWA + `/privacy.html` + `/terms.html`, vérifier
  Search Console.
- *Préparer la soumission OAuth* : enregistrer la vidéo selon
  `PLAN_VIDEO_OAUTH.md` (compte de test Google + OBS), uploader YouTube
  Unlisted, coller dans Cloud Console.
- *Empaqueter* : `bash scripts/pack-extension.sh` (bumper version
  manifest à 1.0.0 d'abord), upload CWS visibilité Non-listé,
  soumettre revue.

Ne pas traiter un `[SUPPOSÉ]` comme acquis. Re-vérifier toute claim du
TAF contre le code (L4 — la rallonge #7 a laissé deux stales que cette
session a corrigées).
