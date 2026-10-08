# État projet Pinkin — 2026-10-06 (réactivation)

## Point de reprise

Projet en pause depuis le 2026-07-18 (fin de la revue de durcissement).
Re-vérifié ce jour [VÉRIFIÉ] :

- `main` propre, synchronisé avec `origin/main` (`a90b4c3`).
- `npm test` : **165/165** (14 fichiers) ; `check:quotes` propre.
- `dist/pinkin-v1.0.0.zip` = sources actuelles octet par octet → prêt tel quel.
- Production pinkin.org = dépôt (`index`, `/privacy`, `/terms` identiques),
  `/pwa/` et fichier Search Console en 200. `.html` → 307 vers l'URL
  propre : utiliser `/privacy` et `/terms` dans les formulaires.
- Dépôt GitHub public.

Rafraîchi ce jour : `FICHE_CWS.md`, `JUSTIFICATION_OAUTH.md`,
`PLAN_VIDEO_OAUTH.md`, `CHECKLIST_LANCEMENT.md`.

## Avancement 2026-10-08

- **Vidéo de démo OAuth faite** : `marketing/cws/pinkin-oauth-demo.webm` (3 min 12, 9 Mo,
  sous-titres EN, zoom sur le client_id). PWA pinkin.org, compte de test, contacts
  fictifs (`marketing/cws/contacts-demo-google.vcf` — le CSV ne passait pas les adresses).
  Parcours : connexion → avertissement « unverified app » → consentement readonly →
  carte → fiche → carnet → opt-in écriture → consentement `contacts` → écriture GEO →
  champ GEO visible dans Google Contacts → déconnexion. Sources : `marketing/cws/video/`.
- **Bug corrigé et déployé** : la PWA envoyait `no-referrer` → tuiles OSM bloquées
  (403 « Access blocked »). Passé en `strict-origin-when-cross-origin`.
- **À vérifier** : l'extension (popup sans meta referrer) — tuiles OK en conditions réelles ?
- **Amélioration possible** : recadrer la carte (`fitBounds`) à la fin du géocodage
  progressif, aujourd'hui elle reste sur la vue monde jusqu'au prochain Sync.
- **Reste** : upload YouTube non répertorié → formulaire de validation OAuth.

## Point de reprise — fin de session 2026-10-07

- **CWS** : fiche complète (textes, icône, 5 captures, vignette, Confidentialité,
  Non répertorié) ; compte développeur complet (nom, e-mail `cedric@mabilotte.com`
  validé, non professionnel, adresse). Reste : « Envoyer pour examen » (opérateur).
- **Cloud Console** : test user `thelittlefrenchy2010@gmail.com` ajouté [VÉRIFIÉ] ;
  un seul secret par client (rien à désactiver) [VÉRIFIÉ].
- **Site** : contact `cedric@mabilotte.com` sur accueil/privacy/terms, déployé (wrangler).
- **Vidéo OAuth — à faire demain** : profil Chrome de démo dans
  `~/.local/pinkin-tools/demo-profile` (lancé en `--lang=en-US`). L'opérateur s'y
  connecte au compte de test, importe `marketing/cws/contacts-demo-google.csv`,
  ferme la fenêtre. Puis : Xvfb `:99` + Chrome sur ce profil (barre d'adresse
  visible, client_id lisible) piloté en CDP, capture `~/.local/pinkin-tools/video/rec.py`
  (PIL ImageGrab), sous-titres EN incrustés avec PIL, encodage webm via le ffmpeg
  de Playwright (`~/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux`, mjpeg → vp8).
  Scénario : `PLAN_VIDEO_OAUTH.md` sur la PWA pinkin.org.
- **Puis** : YouTube non répertorié → formulaire de validation OAuth (textes dans
  `JUSTIFICATION_OAUTH.md`) → passage en production.

## Avancement 2026-10-07

- **Fiche CWS créée** (brouillon, ID `amcfdgfoihfhcdononldbgpoeafgpdpo`) : zip importé
  (sans `key`, cf. `scripts/pack-extension.sh`), description FR + EN, catégorie
  Communication, langue français, URL officielle/accueil pinkin.org, assistance
  GitHub issues, onglet Confidentialité complet, visibilité Non répertorié.
  Restent : icône 128 (`assets/icons/icon128.png`), 5 captures et petite vignette
  (`marketing/cws/`) — import manuel —, puis « Envoyer pour examen ».
- **`manifest.json`** : `key` = clé publique du Store → l'ID dev = l'ID Store.
- **Cloud Console** : redirect `https://amcfdgfoihfhcdononldbgpoeafgpdpo.chromiumapp.org/`
  ajouté au client « Pinkin Extension » ; branding complété (accueil, `/privacy`,
  `/terms`) ; scopes `contacts.readonly` + `contacts` déclarés dans Accès aux données.
  Anciens secrets : vérifié 2026-10-07, un seul secret par client (rien à désactiver). Restent (opérateur) : ajouter le test user
  `thelittlefrenchy2010@gmail.com`, logo éventuel, puis vidéo et soumission à validation.
- Captures CWS + script de rendu (contacts fictifs) : `marketing/cws/`.

## Reste à faire — tout est opérateur

Ordre et détail : `CHECKLIST_LANCEMENT.md`. Résumé : désactiver les anciens
secrets → compte de test + captures + vidéo → soumission CWS (Non-listé) →
consentement OAuth en production + vérification Google → passage en Listé.

## Points d'attention relevés le 2026-10-06 (non bloquants, à arbitrer)

1. **Fiche CWS mono-langue** : pas de `_locales/` dans le paquet, donc pas
   d'onglets en/es dans le dashboard. Ajout possible en V1.0.1.
2. ~~**Politique de confidentialité et hébergeur**~~ **Fait 2026-10-06** — paragraphe « Hébergement du site » fr/en/es ajouté (`278fc8d`), déployé par `wrangler deploy` (version `3743c855`), vérifié en ligne. Webhook GitHub → Cloudflare toujours muet : déployer avec `~/.local/pinkin-tools/node_modules/.bin/wrangler deploy`. Constat initial : elle dit « aucune donnée
   n'est transmise à pinkin.org » ; c'est vrai pour les contacts, mais
   Cloudflare voit l'IP et l'en-tête des visiteurs de la PWA, et la PWA
   appelle `/api/oauth-config`. Une phrase sur l'hébergeur rendrait la
   politique irréprochable (modif + redéploiement).
3. Vidéo à tourner sur la PWA (client ID visible dans l'URL), pas sur
   l'extension.

---

## Historique — état au 2026-06-19 (S10)

## Ce qui est fait

**S10 — Internationalisation complète de l'interface app**
- Toutes les chaînes hardcodées de `ui/shell.js`, `ui/orchestrator.js`,
  `ui/contact-panel.js` remplacées par `t()`.
- Nouveaux blocs i18n FR/EN/ES : `panel.addr.*`, `writePopover.*` (22 clés),
  `invite.*` (8 clés), `error.*` (4 clés), `empty.*` (2 clés),
  `loading.connectExtension`.
- Surfaces couvertes : extension (`popup.js`) et PWA (`app.js`).
- Garde-fou : `npm test` 120/120 (parité FR/EN/ES vérifiée par `test/i18n.test.js`).
- Fix critique : guillemets typographiques U+2018/U+2019 introduits par l'outil
  d'édition dans les appels `t()` → écran blanc dans le browser natif.
  Corrigé par remplacement en masse (voir L19).

**S10 — UX photo et footer**
- Lightbox photo au clic sur l'avatar : cadre format fiche (340px, coins 22px),
  animation scale sans saut, fermeture clic fond ou Échap.
- Qualité photo : URL Google `=s100` → `=s400` dans `core/model/contact.js`.
- Footer `v1.0 · pinkin.org` visible en bas de l'app (position absolute,
  `--footer-h: 28px`, carte/carnet/états décalés en conséquence).

**Packaging V1.0**
- `dist/pinkin-v1.0.0.zip` généré par `scripts/pack-extension.sh` (2,4 Mo, 49 fichiers).
- `dist/unpacked/` synchronisé avec les sources.
- Prêt pour soumission Chrome Web Store.

## État technique

- **Branch** : `main`, arbre propre.
- **Dernier commit** : `7121922` fix lightbox animation.
- **Tests** : 120/120 unit+DOM (E2E non relancés en sandbox — cf. L12).
- **dist/unpacked** : synchronisé (vérifié `diff -rq`).

## En suspens / décisions ouvertes

1. **Soumission CWS** : zip prêt, upload manuel restant (Dashboard Google →
   New Item → `dist/pinkin-v1.0.0.zip` → Unlisted).
2. ~~**Repo public** : décision voie 2 (squash + repo public) pas encore arbitrée.~~
   **Résolu — [VÉRIFIÉ] 2026-07-16** (revue de durcissement, voir
   AUDIT_DURCISSEMENT.md). Cette ligne était stale : `HANDOFF_S9-ter.md`
   établissait déjà en [VÉRIFIÉ] que `github.com/CedricMabilotte/pinkin` est
   public (voie γ exécutée). Re-vérifié directement en re-fetchant la page du
   dépôt : badge « Public » présent. La mention « Code source » peut être
   ajoutée au footer landing.
3. **Lightbox** : actuellement sur `document.getElementById('app')` — vérifier
   visuellement que l'overlay couvre bien le popup entier (à confirmer en test
   manuel).
4. **start_url manifest PWA** : vérifier qu'il pointe bien sur `/pwa/` après
   la session (L14, déjà corrigé en S9-ter, surveiller les régressions).

## Repères techniques

- Dev local PWA : `npm run dev:pwa` → http://localhost:3000
- Extension : charger `dist/unpacked/` dans Chrome (mode développeur)
- Pack : `bash scripts/pack-extension.sh` (exige arbre git propre)
- Tests : `npm test` (vitest, ~1 s)
- Syntaxe JS : `node --input-type=module --check < fichier.js`
- Sync dist/unpacked après modif :
  `cp ui/*.js dist/unpacked/ui/ && cp extension/popup/popup.css dist/unpacked/extension/popup/ && cp core/model/contact.js dist/unpacked/core/model/`
