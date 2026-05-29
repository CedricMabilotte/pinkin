# TAF — pinkin
Trucs à faire plus tard. Capture rapide via `taf:` (convention : ~/.claude/CLAUDE.md).

## À faire — V0.2 résiduel

- **R5 mailto/WhatsApp/Signal côté env opérateur (Linux).** Diagnostic posé
  #7 : `mailto:` configuré sur thunderbird mais probablement vide ; `tel:`
  `sms:` `whatsapp:` sans handler. WhatsApp/Signal émis par Pinkin en URL
  web (`wa.me`, `signal.me`) — devraient marcher dans Chrome. À tester avant
  toute action. À traiter : créer un `.desktop` Gmail handler + `xdg-mime
  default gmail-mailto.desktop x-scheme-handler/mailto`. Voir échange #7.

- **Lot 7 extension MV3 — reproduction hors sandbox Cowork** (ouvert #7,
  partiellement traité #9). xvfb installé côté opérateur (geste réalisé S9).
  En sandbox Cowork, le test timeout sur `waitForEvent('serviceworker')`
  (probable saturation ressources / pas de GPU). À reproduire sur machine
  opérateur (X natif, plus de marge) : `PINKIN_EXT=1 npx playwright test
  --project extension`. Sentinel auto-skip toujours en place. Voir HANDOFF_S9
  bloc 6 + L12.

## À faire — V1.0 mise en magasin (actions opérateur)

- **Compte développeur Chrome Web Store.** ✅ Payé (S9-bis, opérateur).
  Reste à uploader le `.zip` et soumettre — cf. plus bas.

- **Configurer Cloudflare Pages depuis le repo privé** (revirement S9-bis,
  cf. HEBERGEUR_PWA.md « Choix retenu »). Repo `pinkin` reste privé pour
  préserver la posture sécurité #5 (CLIENT_SECRET en clair dans le code).
  Compte Cloudflare gratuit → Pages → Connect to Git → app GitHub installée →
  repo `pinkin` → build settings vide → output `/` → custom domain `pinkin.org`.

- **CNAME chez Gandi** : `pinkin.org` → `pinkin-org.pages.dev` (Cloudflare).

- **Vérifier le domaine `pinkin.org`** dans Google Search Console (TXT DNS
  ou fichier HTML) — préalable à la validation OAuth.

- **Captures d'écran fiche CWS** (5 captures, 1280×800). Plan dans
  `FICHE_CWS.md` (`01-carte.png` à `05-multi-langue.png`).

- **Soumettre l'extension** : `dist/pinkin-v1.0.0.zip` prêt (#9). Chrome Web
  Store dashboard → New Item → upload → visibilité **Non-listé** → soumettre
  revue magasin.

## À faire — V1.0 validation OAuth (actions opérateur + Google)

- **Compte de test Google** peuplé d'une vingtaine de contacts fictifs aux
  adresses variées, pour la vidéo de démo (ne pas exposer le compte perso).

- **Enregistrer la vidéo de démonstration OAuth** selon storyboard
  `PLAN_VIDEO_OAUTH.md`. Upload YouTube en *Unlisted*. Coller le lien dans
  le formulaire OAuth verification.

- **Renseigner les justifications de scope** dans Google Cloud Console
  (formulaire OAuth verification). Textes prêts dans `JUSTIFICATION_OAUTH.md`.

- **Soumettre pour validation Google.** Délai et itérations hors contrôle.
  Quand la validation est obtenue, basculer la visibilité magasin de
  *Non-listé* à *Listé* — Pinkin est public.

## À faire — confort futur (mineur)

- **README §1 OAuth** — explication opérateur du flux OAuth (hérité, à
  remettre à jour avec les choix #8).

- **Multi-carnets (CONCEPT_MULTICARNETS.md)** — Phase D2 différée après V1,
  conception déjà documentée.

- **Phase D2 — Porte 1 (invite contact)** — dépend d'un endpoint Freechi,
  reportée.

- **Renommer la clé i18n `panel.inviteSection`** — la clé porte un nom
  historique (« invite », Phase D2 différée), la valeur dit « Mise à jour /
  Update / Actualización ». Pas un bug runtime, à nettoyer quand on rouvre
  l'i18n. Trouvé S9 (a).

- **Optimiser la taille de `dist/pinkin-vX.Y.Z.zip`** (4,9 Mo aujourd'hui) —
  exclure `assets/icons/pinkin_nouveau_logo.png` (854 Ko) et
  `pinkin_logo_nobg.png` (855 Ko) non utilisés runtime, plus les `.map` de
  Leaflet. Passage attendu ~1 Mo. Mineur, CWS accepte largement plus. Trouvé S9 (b).

## Fait

### Session #9

- **Audit éditorial trilingue** — clos #9. 6 correctifs EN + 1 correctif ES
  sur i18n/{en,es}.js. Calques attrapés (« Search a contact », « To locate »,
  « Authorize writing », « Fill at least », etc.). Garde-fou de parité
  fr/en/es tient. Commit `c58efee`.

- **Audit HTML statique privacy/terms** — clos #9. Limited Use Disclosure
  EN verbatim ajoutée à privacy.html (sécurise validation Google). Cross-link
  /terms.html → /privacy.html bidirectionnel rétabli. Date bumpée à 2026-05-28.
  Commit `3156932`.

- **Audit cohérence inter-artefacts V1.0** — clos #9. Trouvaille majeure :
  contradiction matérielle `client_secret` dans `JUSTIFICATION_OAUTH.md`
  (le code embarque le secret, le doc disait l'inverse) → réécriture honnête.
  Resynchronisation des wordings UI (PLAN_VIDEO_OAUTH + JUSTIFICATION_OAUTH)
  après audit (a). Acté du choix opérateur GitHub Pages dans HEBERGEUR_PWA.
  Commit `0c98041`.

- **Landing pinkin.org `index.html`** — clos #9. Page d'accueil trilingue
  fr/en/es, 363 lignes, autonome (zéro dépendance), palette Pinkin cohérente
  avec privacy.html / terms.html. Sélecteur de langue persisté
  (localStorage + fallback navigator.language). `.nojekyll` à la racine.
  Commit `ced7aeb`.

- **Bump version `0.1.0` → `1.0.0`** — clos #9. manifest.json + package.json
  + package-lock.json (deux occurrences). 120/120 verts post-bump. Commit
  `563024c`.

- **Repack final `dist/pinkin-v1.0.0.zip`** — clos #9. `bash
  scripts/pack-extension.sh` passe ses 8 contrôles défensifs, warning case 0.*
  désormais hors trigger. Zip 4,9 Mo, 61 fichiers, contenu vérifié. Prêt à
  uploader CWS dès que le compte développeur est créé.

- **Activation extension MV3 E2E sous xvfb** — partiel #9. xvfb installé
  (geste opérateur). Test démarre Chrome correctement mais timeout SW MV3
  20s dans sandbox Cowork. Sentinel intact. À reproduire côté opérateur.
  Voir HANDOFF_S9 bloc 6 + L12.

### Session #8

- **i18n traduction réelle en/es + garde-fou parité** — clos #8. `i18n/en.js`
  et `i18n/es.js` passent du stub démonstratif (3 clés) à la traduction
  complète de fr.js. Garde-fou : `test/i18n.test.js` vérifie que toute clé
  feuille de fr existe dans en ET es + que les placeholders mustache sont
  préservés. 3 nouveaux tests, 120 unit/DOM verts.

- **V1.0 artefacts admin** — clos #8. Fichiers prêts à utiliser :
  `HEBERGEUR_PWA.md` (analyse comparée, recommandation Cloudflare Pages),
  `privacy.html` + `terms.html` (palette Pinkin, rédigés pour passer la
  validation OAuth), `FICHE_CWS.md` (description fr/en/es, single purpose,
  permissions, checklist), `JUSTIFICATION_OAUTH.md` (texte formulaire
  Google, Limited Use Disclosure), `PLAN_VIDEO_OAUTH.md` (storyboard
  5 actes, script anglais).

- **Recette packaging `.zip` extension** — clos #8. `scripts/pack-extension.sh`
  produit `dist/pinkin-v<version>.zip` avec contrôles défensifs (arbre
  propre, manifest valide, key présente, icônes, CLIENT_ID renseigné,
  Leaflet local). Liste blanche de ce qui rentre, exclusion explicite des
  tests/docs/pwa. Nettoyage en passant : deux dossiers fantômes
  `extension/{background,popup}/` et `core/{api,model,services}/` supprimés.

- **i18n extraction carnet/contact-panel/orchestrator** — vérifié [VÉRIFIÉ]
  contre le code #8. La rallonge #7 l'avait déjà fait ; TAF stale corrigé.
  `t()` est utilisé 12 fois dans `carnet.js`, 18 dans `contact-panel.js`,
  8 dans `orchestrator.js`. Imports `i18n` présents partout.

- **P1 tooltip sur bouton désactivé** — vérifié [VÉRIFIÉ] contre le code #8.
  La rallonge #7 l'avait déjà fait ; TAF stale corrigé. `setHeaderActionsEnabled`
  swap le title vers « Connecte-toi d'abord à Google Contacts » quand
  disabled (`ui/orchestrator.js:228-233`).

- **141 tests verts re-vérifiés runtime** — clos #8. 117 unit/DOM (`npm
  test`) + 14 E2E PWA-headless + 10 E2E PWA-authenticated (profil OAuth
  toujours valide). La couche authentifiée passe en [VÉRIFIÉ] runtime.

### Session #7 (rallonge incluse)

- **Lot 8 OAuth Google authenticated E2E** — clos rallonge #7. `storageState`
  ne marche pas (Google bloque codegen avec « navigateur non sécurisé »).
  Solution : profil persistant via `scripts/oauth-profile.mjs`
  (`npm run oauth:capture`). 10 E2E authentifiés dans
  `e2e/pwa-auth/carnet-fiche.spec.js`. Pour réauthentifier (token expiré
  ou nouveau compte) : `rm -rf e2e/.auth/profile && npm run oauth:capture`.

- **Couverture étendue Lot 1+2 #7** — clos. CI verte vérifiée (`gh run
  list`), test « clic à vide » supprimé, console-strict filtré. Nouveaux
  modules : `crypto.test.js` (7), `contacts-sync.test.js` (6),
  `oauth-callback.spec.js` (2 E2E — ferme la régression bug #5).

- **Boutons d'en-tête grisés avant auth + tooltips enrichis (R1+R2)** —
  clos #7 Lot 4. `disabled` sur 5 éléments, CSS `:disabled` visible.
  `setHeaderActionsEnabled()` dans `orchestrator.js`. 2 E2E associés.
  Validation visuelle Claude in Chrome.

- **Refactor minimal `decideWriteState`** — clos #7 Lot 5. Logique du
  contrôle d'écriture extraite en module pur `ui/write-state.js`. 8 tests
  unitaires couvrent les invariants D1 (cache géo complet avant
  publication, respect du geste utilisateur sur le retrait).

- **i18n bootstrap fr/en/es** — clos #7 Lot 6 (infrastructure). 9 tests
  unit + 2 E2E (bascule navigator.language en Chromium). Toute la copie de
  `shell.js` extraite vers `i18n/fr.js`. Complété en #8 : extraction
  carnet/contact-panel/orchestrator (avait été faite en rallonge #7 mais
  TAF stale) + traduction effective en.js/es.js.

- **Lot 7 extension MV3 — mécanique posée** — clos #7. Project Playwright
  dédié + sentinel auto-skip. Activation conditionnée à env xvfb/X11
  (suspens TAF).

- **R4 — import .vcf VÉRIFIÉ en runtime** — clos #7 (test opérateur). Le
  `[SUPPOSÉ]` hérité de #3 (sélection → parse → pré-remplissage formulaire)
  passe à [VÉRIFIÉ]. Voir HANDOFF_S6.md (amendement de tête).

### Sessions #5 et #6

- **Tests unitaires fantômes** (leçon #4 L6) — clos #5. Vérifié : aucun fichier
  de test n'a jamais existé dans l'historique git. Recréés : 36 cas
  (`contact-status`, `vcard-reader`, `contact`, `geopoint`), `npm test`.

- **Secrets OAuth dans le code suivi** (leçon #4 L5) — clos #5. Le dépôt distant
  a été créé privé et le reste en permanence (décision opérateur) : le risque
  propre au dépôt public ne se matérialise pas.

- **Infra de tests Vitest + Playwright + CI** — clos #6. 93 tests
  automatisés (84 unit/DOM + 9 E2E PWA), tous verts. Workflow GitHub Actions
  prêt. Stack réutilisable hors Pinkin. Voir `PLAN_TESTS_V0.2.md`.

- **Couverture geocoder / vcard-writer / carnet** — clos #6. 48 nouveaux
  tests qui scellent la mémoire d'échecs (#3), le seuil MIN_PLACE_RANK (#3),
  et la résolution du trou UX (#2). Voir `test/geocoder.test.js`,
  `test/vcard-writer.test.js`, `test/dom/carnet.test.js`.

- **Validation visuelle P1 + P3 refonte #5** — clos #6 (Claude in Chrome).
  Popover d'écriture ancré sous bouton, popover de déconnexion in-app
  remplaçant `confirm()` natif, Annuler ferme proprement.
