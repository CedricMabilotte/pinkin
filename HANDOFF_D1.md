# Pinkin — État de reprise (clôture de la session Phase D1)

Instantané de fin de session, pour reprendre proprement plus tard.
Le contexte stable du projet reste dans `BRIEF_PINKIN.md` ; ce fichier-ci est l'état de session.

## Ce qui a été livré

**Phase D1 — complète : refonte de l'authentification + écriture GEO dans Google Contacts.**

- **Auth refondue.** Flux unique OAuth 2.0 Authorization Code + PKCE + `client_secret`,
  mutualisé dans `core/auth/pkce-auth.js`. L'extension utilise
  `chrome.identity.launchWebAuthFlow`, hébergé dans le service worker
  (`extension/background/auth-worker.js`) ; `platform-extension.js` n'est qu'un
  proxy par message. La PWA : redirection + page de callback. `getAuthToken`
  (propriétaire Chrome) a été abandonné — l'extension fonctionne donc dans Brave.
- **Écriture GEO.** `read-merge-write` sûr (`core/api/google-people.js`),
  publication groupée à l'opt-in, correction d'adresse par contact, retrait
  (réversibilité). Garde-fou de précision (`place_rank`).
- **Trois passes de revue + durcissement** : robustesse, sécurité, confort d'usage.
- **Audit de conformité soumission Google** effectué.

## Vérifié vs NON vérifié — À LIRE EN PREMIER

Testé en runtime (extension, dans Brave) et **confirmé fonctionnel** par l'utilisateur,
sur de vrais contacts Google : connexion, carte, géocodage, opt-in écriture,
publication, correction d'adresse, retrait.

**MAIS** — des changements substantiels ont été faits *après* ce test et ne sont
**pas** re-vérifiés en conditions réelles :
- Passage sécurité : paramètre `state` anti-CSRF, validation du schéma d'URL de
  photo, validation des coordonnées à l'écriture, révocation par le corps.
- Passage confort : écrans d'état vide / erreur, messages d'échec de connexion,
  comptage honnête du géocodage, vocabulaire, accessibilité.
- Durcissement tier-2 : timeouts réseau, déduplication d'auth, mémoïsation du refresh.

➜ **Première action de la prochaine session** : recharger l'extension dans Brave et
re-dérouler le parcours complet, en insistant sur le flux d'auth (le `state` est
nouveau dans le chemin) et les nouveaux états d'interface.

**La PWA n'a jamais été testée en runtime** — ni le callback, ni la CSP, ni l'URI
de redirection. Tout le volet PWA est à éprouver.

## Ce qui reste

**Phase D2 — ponts vers le framework Freechi**
- Porte 1 (« inviter un contact à mettre à jour sa fiche ») : **reportée** —
  incompatible avec l'invariant zéro-backend tant que Freechi n'expose pas un
  endpoint formulaire sans compte.
- Porte 2 (« rejoindre la communauté ») : **à faire** — CTA vers l'inscription
  Freechi avec un code de parrainage first-party. Dépend d'une inscription
  publique Freechi en ligne.

**Phase E — distribution.** Checklist non-code (cf. audit de soumission) :
- Rédiger et publier `/privacy` et `/terms` sur pinkin.org (blocage dur de la
  vérification OAuth).
- Vérifier le domaine pinkin.org dans la Search Console.
- Écran de consentement OAuth : logo, e-mail de support, justification du scope
  écriture ; basculer « Testing » → « In production » et soumettre à vérification.
- Vidéo de démonstration (exigée pour le scope sensible `contacts`).
- Formulaire « pratiques de confidentialité » du Chrome Web Store + actifs de fiche.
- À la création de l'item Store : relever l'ID définitif de l'extension et
  re-pointer dessus l'URI de redirection OAuth.
- Valider puis retirer la `host_permission` `tile.openstreetmap.org` (les tuiles
  sont des `<img>`, pas des `fetch` — la permission est probablement superflue).
- Déployer la PWA sur pinkin.org.

**Dette mineure connue, non bloquante**
- Piège de focus clavier (cycle de Tab) du panneau contact : non implémenté
  (Échap + focus à l'ouverture, eux, le sont). Jugé faible coût/bénéfice.
- `extension/main.js` : fichier mort (popup.js fait sa propre injection).
- Publication incrémentale : un contact géocodé *après* la publication groupée
  n'est pas republié automatiquement (la correction par contact le couvre).

## Faits clés

- Projet Google Cloud : **pinkin-497020**.
- Client OAuth extension (type « Application Web ») :
  `915913862394-15r7r64lp6oas4ism98r4g52bqd0ifq1.apps.googleusercontent.com`
- Client OAuth PWA (type « Application Web ») :
  `915913862394-h2oldnp0ss4skevi0jo1d8qjtr2m2qkl.apps.googleusercontent.com`
- Les `client_secret` sont **embarqués** (choix assumé) dans `auth-worker.js` et
  `platform-pwa.js` — Google les exige pour un client Web, même en PKCE ; le
  risque est borné par le verrouillage du client sur ses URI de redirection.
- ID de l'extension figé par le champ `key` du manifeste :
  **pnobmjminhgbbgpbogljljojaojiapdp**
- URI de redirection OAuth extension enregistrée côté Google :
  `https://pnobmjminhgbbgpbogljljojaojiapdp.chromiumapp.org/`
- Scope `https://www.googleapis.com/auth/contacts` ajouté à l'écran de
  consentement ; écran en mode « Testing » (re-consentement hebdomadaire en
  l'état — disparaît à la vérification).

## État technique

20 fichiers JS — syntaxe vérifiée. `manifest.json` et `pwa/manifest.webmanifest`
valides. `manifest.json` : `minimum_chrome_version` 116 (l'app utilise
`AbortSignal.any`), `homepage_url` renseigné. Aucun fichier de travail résiduel.
