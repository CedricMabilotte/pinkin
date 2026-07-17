# État projet Pinkin — 2026-06-19 (S10)

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
