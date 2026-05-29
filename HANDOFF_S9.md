# HANDOFF — Session #9 : durcissement V1.0 (audit + landing + bump 1.0.0)

Dernier point de reprise. Sessions suivantes lisent `BRIEF_PINKIN.md`, puis
`HANDOFF_S8.md`, puis ce fichier. À lire en complément : `TAF.md` (rafraîchi
en S9), `HEBERGEUR_PWA.md` (section « Choix retenu » ajoutée en S9, **révisée
en S9-bis** — voir amendement ci-dessous).

Convention maintenue depuis #2 : **[VÉRIFIÉ]** = constaté à l'exécution
(opérateur ou contrôle automatique) ; **[SUPPOSÉ]** = correct sur lecture du
code et contrôle de syntaxe, pas éprouvé en runtime.

---

## Amendement S9-bis — revirement hébergeur (à lire en premier)

En clôture de S9, après que ce HANDOFF a été poussé sur `origin/main`,
l'opérateur a soulevé une objection sur le choix GitHub Pages : passer
le repo public — préalable du plan Free — expose les deux
`CLIENT_SECRET` Google embarqués en clair dans le code suivi (cf.
décision #5 / L5). La trouvaille majeure de l'audit (d) S9 (la
contradiction `client_secret` dans `JUSTIFICATION_OAUTH.md`) renforçait
précisément cet enjeu.

Trois voies présentées en texte :
1. **Cloudflare Pages depuis le repo privé** — repo privé conservé, 0 €,
   0 effort code, retour à la reco S8 d'origine.
2. **Régénération des secrets + sortie du code + repo public + GitHub
   Pages** — 1-2 h de travail Claude + geste opérateur ; ne résout pas le
   fond (le secret reste lisible dans le binaire distribué).
3. **GitHub Pro + repo privé + GitHub Pages** — 4 $/mois, alignement parc.

**Opérateur tranche Voie 1.** Compte CWS payé en parallèle (geste opérateur
réalisé S9-bis).

Modifications apportées par S9-bis (commit dédié, à lire dans le log) :
- `HEBERGEUR_PWA.md` : la section « Choix retenu » est réécrite — Cloudflare
  Pages, avec l'historique du revirement et la recette détaillée.
- `index.html` : commentaire d'en-tête mis à jour pour Cloudflare ;
  avertissement ajouté sur le lien « code source » qui reste 404
  pour un visiteur externe tant que le repo est privé.
- `.nojekyll` : supprimé (spécifique GitHub Pages).
- `TAF.md` : « passer le repo public » retiré ; « configurer GitHub Pages »
  → « configurer Cloudflare Pages » ; CNAME cible changé.

Tout le reste de ce HANDOFF tient. La posture sécurité #5 / L5 (« repo
privé pour ne pas matérialiser le risque ») est **préservée** — pas
révisée. La discipline « relecture de l'opérateur » a tenu : l'objection
arrive à la bonne couche (sécurité), pas trop tard pour corriger.

---

---

## Où en est le produit

V1.0 est **durcie pour la soumission** : les artefacts produits en #8 ont
été audités sous quatre angles, six divergences attrapées et corrigées
(une matérielle, cinq d'usage), la landing utilisateur `pinkin.org/`
est créée trilingue, et le manifest est bumpé à `1.0.0`. Tout le travail
restant relève de gestes opérateur ou de latence Google.

Tests : **120/120 unit/DOM re-vérifiés** runtime cette session. E2E PWA
non re-tournés (sandbox Cowork timeout 45 s par appel — constat
opérationnel hérité, voir L12 plus bas).

Les artefacts V1.0 prêts à utiliser, à la racine du dépôt :

| Fichier | Usage | Statut S9 |
|---|---|---|
| `index.html` | Landing pinkin.org trilingue (fr/en/es) | **nouveau S9** |
| `.nojekyll` | Désactive Jekyll côté GitHub Pages | **nouveau S9** |
| `privacy.html` | Page Confidentialité, Limited Use FR+EN verbatim | renforcée S9 |
| `terms.html` | Page Conditions d'utilisation | mis à jour S9 (date) |
| `HEBERGEUR_PWA.md` | Analyse comparée + **choix retenu : GitHub Pages** | acté S9 |
| `FICHE_CWS.md` | Texte fiche Chrome Web Store (fr/en/es) | inchangé S9 |
| `JUSTIFICATION_OAUTH.md` | Justification scopes Cloud Console | corrigé S9 (sécurité) |
| `PLAN_VIDEO_OAUTH.md` | Storyboard vidéo OAuth | resynchronisé S9 |
| `scripts/pack-extension.sh` | Empaquetage `.zip` reproductible | inchangé S9 |
| `dist/pinkin-v1.0.0.zip` | Zip CWS prêt à uploader (4,9 Mo, 61 fichiers) | **nouveau S9** |

---

## Le fil de la session

Reprise (L4) : `git status` propre, `origin/main` à `b5a5106` (clôture #8),
`npm test` 120/120 verts (note : table de tête de HANDOFF_S8 dit « 117 »
mais le corps du même handoff dit « 120 » — claim stale du handoff S8
attrapée et rectifiée ici). E2E pwa-headless ne tient pas dans la
fenêtre de 45 s du sandbox (constat #8 L11, persistant ; voir L12 S9).
E2E pwa-authenticated non re-vérifiée (profil OAuth côté opérateur).

Cadrage soumis en texte (L2). Quatre arbitrages reçus :
- (a) audit éditorial trilingue → faire ;
- (b) bump version + repack final → faire ;
- (c) audit HTML privacy/terms → faire ;
- (d) audit cohérence inter-artefacts → faire ;
- plus **(nouveau) landing pinkin.org** ;
- hébergeur retenu : **GitHub Pages** (vs reco Cloudflare Pages) ;
- xvfb installé côté opérateur — activer le Lot 7 extension MV3.

Exécution en cinq blocs (cohérence d'ordonnancement : audits avant bump+repack
pour que le zip capture les correctifs amont).

### Bloc 1 — (a) Audit trilingue (commit `c58efee`)

Six correctifs sur i18n/en.js, un sur i18n/es.js — calques attrapés en
relecture critique :

| Clé | Avant | Après | Raison |
|---|---|---|---|
| `header.write.title` EN | « Let Pinkin save… » | « Allow Pinkin to save… » | langage de permission |
| `carnet.searchPlaceholder` EN | « Search a contact… » | « Search contacts… » | calque FR |
| `carnet.searchAriaLabel` EN | « Search a contact » | « Search contacts » | calque FR |
| `carnet.statusUnresolved` EN | « To locate » | « Pending location » | statut, pas action |
| `panel.authorizeWrite` EN | « Authorize writing » | « Allow write access » | « writing » ambigu |
| `panel.formEmpty` EN | « Fill at least… » | « Fill in at least… » | non-idiomatique |
| `welcome.tagline` ES | « Marca a tus seres queridos… » | « Fija a tus seres queridos… » | cohérence interne ES |

Garde-fou de parité (S8 L8 acquis) passe : 120/120 verts. Aucun
placeholder mustache cassé.

Note laissée : la clé `panel.inviteSection` porte un nom historique
« invite » (Phase D2 différée), sa valeur dit « Mise à jour / Update /
Actualización ». Pas un bug de traduction, à renommer si on rouvre l'i18n.

### Bloc 2 — (c) Audit HTML statique (commit `3156932`)

Sur `privacy.html` et `terms.html`. Trois correctifs, plusieurs
vérifications passées sans action.

**Vérifications passées (aucune action) :**
- 8 liens externes (Google policies, OSM, GitHub) : tous **200 OK** vérifiés
  HEAD à l'instant T.
- Palette Pinkin présente : `--rose #C2185B`, `--fuchsia #E91E8C`,
  `--blush #FCE4EC`, `--fond #FDF6F0`.
- Balises HTML équilibrées (privacy : 77/77, terms : 49/49).
- Pas d'ancre interne cassée (aucun `href="#..."` à valider).
- Structure h1/h2/h3 cohérente.

**Correctifs :**
- **privacy.html — Limited Use Disclosure verbatim EN ajoutée à côté de
  la version FR.** Sécurise la validation Google scope sensible : un
  réviseur qui cherche la phrase canonique anglaise la trouve mot pour
  mot, plutôt qu'une paraphrase française à valider linguistiquement.
- **privacy.html — cross-link footer vers /terms.html ajouté.**
  Asymétrie corrigée : terms.html liait privacy.html deux fois, le
  chemin inverse manquait.
- Date des deux pages : 27 → 28 mai 2026 (révision matérielle).

### Bloc 3 — (d) Audit cohérence inter-artefacts (commit `0c98041`)

Relecture croisée FICHE_CWS / JUSTIFICATION_OAUTH / PLAN_VIDEO_OAUTH /
HEBERGEUR_PWA / privacy.html / terms.html / code. Quatre correctifs.

**Trouvaille majeure — contradiction matérielle (à risque de rejet OAuth).**

`JUSTIFICATION_OAUTH.md` ligne 167 prétendait : « Pas de `client_secret`
envoyé depuis le navigateur (PKCE le rend non nécessaire). » C'est faux —
le code embarque le `client_secret` dans
`extension/background/auth-worker.js` (l. 33) et
`pwa/platform-pwa.js` (l. 28), et l'envoie à l'échange de code
(`core/auth/pkce-auth.js` l. 102 et 127). L'en-tête de `pkce-auth.js`
l'explicite : « Google traite tout client OAuth "Application Web" comme
confidentiel et EXIGE le client_secret à l'échange de code — PKCE n'y est
qu'une protection additionnelle, pas un substitut au secret. » Pinkin
embarque donc le secret dans le code public ; le risque est borné par
le verrouillage du client OAuth sur ses URIs de redirection
(`chromiumapp.org` côté extension, `pinkin.org` côté PWA).

Si un réviseur Google avait inspecté le code source open source ou la
requête réseau pendant la vidéo OAuth, il aurait constaté la
contradiction et probablement rejeté. **Réécriture du tableau « Auth
flow » en description honnête, pointant le module + son en-tête.**

**Trois autres correctifs (resynchronisation après (a)) :**
- `PLAN_VIDEO_OAUTH.md` acte 4 : « Authorize Pinkin to save… » →
  « Allow Pinkin to save… » ; bouton « Authorize writing » →
  « Allow write access ».
- `JUSTIFICATION_OAUTH.md` scope `contacts` : `'Authorize writing' button`
  → `'Allow write access' button`.
- `HEBERGEUR_PWA.md` : nouvelle section de tête **« Choix retenu —
  GitHub Pages »**, qui acte la décision opérateur S9 et renvoie à la
  recette d'origine plus bas (option B), avec note sur le compromis vs
  recommandation S8 (Cloudflare).

**Vérifications consistantes (aucune action) :**
- Scopes `contacts.readonly` + `contacts` : cohérents partout.
- Champ GEO RFC 6350 : cohérent partout.
- URLs `/privacy.html`, `/terms.html` : cohérentes partout.
- Limited Use Disclosure verbatim EN désormais aligné JUSTIFICATION_OAUTH
  ↔ privacy.html (le second corrigé par S9 (c)).
- Single purpose description : cohérent FICHE_CWS ↔ JUSTIFICATION_OAUTH.
- Architecture sécurité (AES-GCM 256, WebCrypto, chrome.identity,
  PKCE, pas de backend) : cohérent doc ↔ code.
- FICHE_CWS « bouton "Autoriser l'écriture" » côté FR : encore aligné
  avec i18n/fr.js (inchangé en S9).

### Bloc 4 — Landing pinkin.org (commit `ced7aeb`)

Création de `index.html` (363 lignes) + `.nojekyll`. Page autonome,
zéro dépendance, CSS et JS inline. Trilingue fr/en/es avec sélecteur de
langue persisté (localStorage, fallback `navigator.language`). Palette
Pinkin cohérente avec privacy.html et terms.html.

**Structure.** Header (marque + langue) · Hero (logo 96 px, tagline,
2 CTAs : Install Chrome bientôt, Try in browser → /pwa/) · Features
(4 cartes : zéro serveur, zéro tracker, code ouvert, trilingue) ·
Comment ça marche (4 étapes) · Footer (Privacy / Terms / Source code).

**Parité trilingue vérifiée :** 22 chaînes en `data-lang="fr"`, 22 en
`"en"`, 22 en `"es"`.

**Pré-déploiement GitHub Pages (geste opérateur, consigné dans
l'en-tête `index.html`) :** le repo `pinkin` est privé (décision #4
héritée). GitHub Pages **Free** exige un repo public — donc l'opérateur
devra (a) passer le repo en public au lancement (le code étant
open source par licence, cohérent), OU (b) upgrade plan, OU (c) repo
distinct dédié à la landing+pwa+pages annexes. Recommandation : (a),
le plus aligné avec l'esprit libre du projet.

### Bloc 5 — Bump version + repack (commits `563024c`, repack hors-git)

Bump `0.1.0` → `1.0.0` sur trois fichiers cohérents :
- `manifest.json` (extension MV3),
- `package.json` (npm),
- `package-lock.json` (deux occurrences au début).

`manifest.webmanifest` (PWA) n'a pas de champ `version` par convention
PWA spec, pas de bump.

Tests **120/120** après bump.

`bash scripts/pack-extension.sh` exécuté :
```
✅ Arbre git propre.
✅ Manifest parsable.
✅ Version manifest : 1.0.0    (warning case 0.* désormais hors trigger)
✅ key présent dans manifest.
✅ Icônes 16/32/48/128 px présentes.
✅ CLIENT_ID extension renseigné.
✅ Leaflet bundlé local présent.
✅ Empaquetage terminé.
   Fichier : dist/pinkin-v1.0.0.zip
   Taille  : 2,4M
```
Contenu vérifié : 61 fichiers, manifest + extension/ + core/ + ui/ + i18n/
+ assets/icons/ + lib/leaflet/. Pas de test/, pas de node_modules/, pas
de docs internes. `dist/` gitignored.

### Bloc 6 — Extension MV3 E2E avec xvfb (partiel)

xvfb installé par l'opérateur (geste réalisé). Test lancé :
```bash
xvfb-run -a -s "-screen 0 1280x800x24" \
  env PINKIN_EXT=1 \
  npx playwright test --project extension --retries=0
```
Résultat : **timeout à 20 s sur `waitForEvent('serviceworker')`**.
Screenshot d'échec confirme que Chrome démarre bien (display xvfb
fonctionne, image rendue blanche = pas de page active, attendu), mais
le service worker MV3 ne s'enregistre pas dans la fenêtre allouée par le
test.

Cause probable : sandbox Cowork contraint (pas d'accélération GPU, sans
doute des syscalls bloqués) ne fait pas remonter le SW MV3 à
Playwright dans les 20 s. Côté machine opérateur (X natif, plus de
ressources), le test peut très bien passer.

**Sentinel intact** : test reste auto-skip si `PINKIN_EXT` non posé.
Aucune régression CI. À reproduire côté opérateur — consigne au TAF.

---

## La récolte, par niveaux

### Niveau produit

**Fruits.** Un utilisateur arrivant sur `pinkin.org` y trouve désormais
une vraie page d'accueil — pas une PWA brute qui démarre sans contexte.
Trilingue, palette cohérente avec les pages légales, deux CTAs clairs.
La validation OAuth Google a deux nouvelles cartouches de sécurité : la
Limited Use Disclosure existe maintenant en EN verbatim (réviseur la
trouve grep-able), et la justification du flow OAuth dit la vérité sur
le `client_secret` (un réviseur qui inspecte ne tombe pas sur un
mensonge).

**Verrou unique restant côté code.** L'extension MV3 E2E hors sandbox
Cowork — sentinel toujours en place, à confirmer par l'opérateur sur
sa machine. Hors scope session — geste opérateur.

### Niveau architecture & code

**Fruit majeur — discipline de cohérence inter-docs.** L'audit (d) a
matérialisé la valeur de la relecture croisée : un seul claim faux
dans `JUSTIFICATION_OAUTH.md` (sur le `client_secret`) aurait suffi à
faire rejeter la soumission Google si un réviseur s'y intéressait. Le
contrôle a été manuel ; un garde-fou plus automatique demanderait des
liens « doc → ligne de code » à valider en CI, ce qui est lourd. La
discipline reste « relecture croisée à chaque renforcement » — à
inscrire dans le post-it routine-fin de Pinkin.

**Discipline du bump de version.** Trois fichiers à toucher en cohérence
(`manifest.json`, `package.json`, `package-lock.json`), pas un seul.
Le warning `pack-extension.sh` sur `version: 0.*` a parfaitement joué
son rôle de garde-fou — il l'a déjà sécurisé en S8, et a tenu en S9.

### Niveau méthode

**Fruit.** L'ordre d'exécution proposé en cadrage **a → c → d → landing
→ b → MV3** a tenu jusqu'au bout : chaque correctif aval pouvait
s'appuyer sur les correctifs amont, et le repack final a capturé toutes
les corrections en un seul zip prêt à l'emploi.

**Leçon (#9).** **L12 — Sandbox Cowork incompatible avec Playwright E2E
qui dépasse 30-40 s** (voir détail plus bas).

### Niveau stratégique

**Choix tenus.**
- Hébergeur PWA tranché : GitHub Pages (opérateur, vs reco S8 Cloudflare).
  Risque facture surprise jugé acceptable par l'opérateur.
- xvfb installé : geste préalable de S8 honoré.
- Audits demandés en séquence : tous tenus dans une session.

**Décision matérielle à arbitrer (mineure, geste opérateur).** Passage
du repo `pinkin` de privé → public, préalable à l'activation GitHub
Pages Free. Cohérent avec la licence open source. Alternative : upgrade
plan ou repo distinct, plus coûteux.

### Niveau méta

**Contraintes maintenues.** L2 (questions en texte, jamais QCM — appliqué
au cadrage S9), L4 (re-vérifier les claims contre le code — la
trouvaille `client_secret` est une L4 directe), L8 (épuiser ce que
Claude peut vérifier soi-même avant déléguer — vérification 8 liens
externes, audit éditorial complet, tout fait localement), L9 (pas de
processus persistant — Playwright reste `webServer.reuseExistingServer`),
L11 (workers Playwright ≤ 2 hors-CI — `playwright.config.js` inchangé).

---

## Leçon #9

**L12 — Sandbox Cowork : timeout 45 s par appel bash. Conséquences pour Playwright E2E.**

Cas vécu :
- La suite `pwa-headless` (14 tests) ne tient pas dans la fenêtre de
  45 s (~30 s côté opérateur post-L11, plus le boot du serveur dev
  + chromium = dépasse).
- Le test `extension` solo (1 test) ne tient pas non plus avec un retry
  (1ʳᵉ tentative 35 s + retry 35 s = 70 s, hors fenêtre).
- Le test solo sans retry tient en ~30 s mais échoue sur cause distincte
  (timeout SW MV3, voir bloc 6).

Conséquence pour Claude opérant en Cowork :
1. Les E2E ne sont vérifiables soi-même que par groupe ≤ 6-7 tests et
   sans retry, ou en lançant des sous-ensembles ciblés.
2. Pour vérifier 14/14 ou 10/10 d'une suite après une modif, il faut
   soit splitter, soit déléguer la re-vérification à l'opérateur en
   clôture, soit accepter de tourner « à blanc » sans confirmation
   runtime (et marquer `[SUPPOSÉ]`).

Verdict : *garde-fou de méthode*. À consigner ici et à intégrer à la
discipline de session — **ne pas s'engager à re-vérifier en runtime
une suite E2E complète en sandbox Cowork ; soit splitter par sous-paquet,
soit annoncer dès le cadrage que la re-vérif E2E sera déléguée à
l'opérateur en clôture**. La couche unit/DOM (120 tests en 1,3 s) reste,
elle, parfaitement vérifiable à chaque modif.

**Statut : clos — consigné comme contrainte de session.**

---

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ]** :
- Arbre git propre, 5 commits S9 prêts à pousser.
- `npm test` 120/120 après chaque commit S9.
- Tous les liens externes des pages statiques répondent HTTP 200.
- Palette Pinkin vérifiée par contrôle de présence des hex (privacy,
  terms, index).
- Balises équilibrées sur les 3 HTML (77/77, 49/49, 106/106).
- Parité trilingue de `index.html` (22/22/22 sur data-lang).
- `dist/pinkin-v1.0.0.zip` produit (4,9 Mo, 61 fichiers, contenu
  vérifié `unzip -l`).
- `bash scripts/pack-extension.sh` passe ses 8 contrôles défensifs.
- xvfb-run démarre Chrome correctement (screenshot du test échoué
  prouve un display fonctionnel).
- La traduction de `client_secret` côté JUSTIFICATION_OAUTH matche
  désormais le code (4 occurrences inspectées).

**[SUPPOSÉ]** — à éprouver en session suivante ou côté opérateur :
- E2E PWA-headless 14 tests : non re-tournés en S9 (sandbox Cowork
  timeout, cf. L12). Last green = S8.
- E2E PWA-authenticated 10 tests : non re-tournés en S9 (profil OAuth
  côté machine opérateur). Last green = S8.
- Rendu visuel `index.html` dans un vrai navigateur (servi local ou
  GitHub Pages) — la page est testée structurellement, pas
  visuellement.
- Extension MV3 E2E hors sandbox Cowork — peut passer côté opérateur,
  consigne au TAF.
- Bascule trilingue `index.html` en runtime navigateur — JS testé par
  lecture, pas par exécution dans un Chromium.

---

## Décisions en attente / portes ouvertes pour la suite

- **Repo `pinkin` privé → public** (préalable GitHub Pages Free, ou
  alternative). Geste opérateur.
- **Compte développeur CWS** (5 $) — lien :
  https://chrome.google.com/webstore/devconsole/register
- **Compte de test Google** + vidéo OAuth selon `PLAN_VIDEO_OAUTH.md`.
- **CNAME `pinkin.org`** chez Gandi → `cedricmabilotte.github.io`.
- **R5 mailto/WhatsApp/Signal côté env opérateur** — diagnostic
  posé #7, traitement reporté.
- **Extension MV3 E2E hors sandbox** — `PINKIN_EXT=1 npx playwright
  test --project extension` sur machine opérateur (X natif, plus de
  ressources). Sentinel intact en attendant.
- **Optimisation taille zip CWS** (mineur) — 4,9 Mo dont ~2 Mo de
  `pinkin_nouveau_logo.png` + `pinkin_logo_nobg.png` dans
  `assets/icons/` non utilisés runtime, et ~3 Mo de `.map` Leaflet
  optionnels. Possible passage à ~1 Mo. Hors urgence.

---

## Pour démarrer la session suivante

Lire `BRIEF_PINKIN.md`, `HANDOFF_S8.md` (avec ce qu'il contient déjà),
ce fichier, puis selon le souhait :

- *Pousser vers la mise en magasin* : passer le repo public (ou
  alternative), configurer GitHub Pages, CNAME chez Gandi, déployer,
  vérifier Search Console.
- *Préparer la soumission OAuth* : enregistrer la vidéo selon
  `PLAN_VIDEO_OAUTH.md` (le storyboard est resynchronisé avec les
  nouveaux libellés EN).
- *Soumettre l'extension* : `dist/pinkin-v1.0.0.zip` est prêt, upload
  CWS visibilité Non-listé, soumettre revue.
- *Activer le Lot 7 MV3 E2E* : sur machine opérateur (`PINKIN_EXT=1`
  + X natif), vérifier que le test passe (ou pas) hors sandbox Cowork.

Ne pas traiter un `[SUPPOSÉ]` comme acquis. Re-vérifier toute claim du
TAF contre le code (L4 — S9 a attrapé deux stales : l'affichage 117
vs 120 du HANDOFF_S8, et la contradiction `client_secret`).
