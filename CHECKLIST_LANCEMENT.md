# Checklist de lancement V1.0 — pinkin

> **Réactivation 2026-10-06 — re-vérifié [VÉRIFIÉ] :** `npm test` 165/165,
> `check:quotes` propre, arbre git propre et synchronisé avec `origin/main`
> (`a90b4c3`) ; `dist/pinkin-v1.0.0.zip` identique octet par octet aux
> sources actuelles (pas de repack) ; pinkin.org, `/privacy`, `/terms`,
> `/pwa/` et le fichier de vérification Search Console répondent en HTTPS,
> contenu = dépôt. Fiche CWS, justification OAuth et plan vidéo rafraîchis
> le même jour (permission `oauth2.googleapis.com` justifiée, onglet
> *Privacy practices*, URLs sans `.html`, points de rejet vidéo, passage
> *Testing → In production*). **Aucune étape opérateur ci-dessous n'a
> bougé depuis juillet** — tout reste à faire à partir de l'étape 1.

*Consolidée le 2026-07-17, à la clôture de la revue de durcissement
(`AUDIT_DURCISSEMENT.md`, `TESTS_DURCISSEMENT.md`). Objectif : un seul
document, dans l'ordre d'exécution, pour ce qui reste réellement à faire
avant que Pinkin soit publiquement listé sur le Chrome Web Store. Les items
ci-dessous existaient déjà, dispersés et partiellement dupliqués entre trois
sections de `TAF.md` (« actions opérateur RESTANTES », « mise en magasin »,
« validation OAuth ») — certains avec un état hébergement stale (Cloudflare
Pages/Gandi, corrigé dans `TAF.md` le même jour). Ce fichier ne les répète
pas en détail, il pointe vers le document source de chaque étape.

Toutes les étapes ci-dessous sont des **actions opérateur** — comptes
tiers (Google Cloud Console, Chrome Web Store), upload de vidéo/captures,
ou décisions qui t'appartiennent. Aucune n'est automatisable par un agent.

---

## 0. Prérequis technique — fait, à confirmer une dernière fois

- [x] Suite de tests unitaires + DOM verte (`npm test`).
- [x] Suite e2e `pwa-headless` verte, y compris le nouveau test offline
      (`e2e/pwa/offline.spec.js` — éprouve que le service worker fraîchement
      enregistré tient sa promesse offline, pas seulement en théorie).
- [ ] **Toi** : si tu veux, relance une dernière fois `npm test` et
      `npx playwright test --project pwa-headless` sur ta machine avant de
      passer à la suite — la dernière exécution vérifiée est documentée
      dans `TESTS_DURCISSEMENT.md`.

## 1. Nettoyage sécurité (2 min)

- [ ] **Désactiver les anciens `CLIENT_SECRET`** dans Google Cloud Console
      (Credentials → OAuth 2.0 Client IDs → les entrées pré-S9-ter). Les
      nouveaux secrets (post-rotation, voie γ) sont seuls actifs depuis
      S9-ter ; les anciens traînent encore listés sans être utilisés.

## 2. Assets de la fiche Chrome Web Store

- [ ] **5 captures d'écran 1280×800** — plan détaillé dans `FICHE_CWS.md`
      (`01-carte.png` à `05-multi-langue.png`).
- [ ] **Vidéo de démonstration OAuth (~4 min)** — storyboard dans
      `PLAN_VIDEO_OAUTH.md`. Utiliser le **compte de test Google** peuplé de
      contacts fictifs (pas le compte personnel). Upload YouTube en
      **Unlisted**, garder le lien.

## 3. Soumission Chrome Web Store

- [ ] Remplir aussi l'onglet **Privacy practices** (remote code : non ;
      données : PII + authentification ; 3 certifications) — détail dans
      `FICHE_CWS.md`.
- [ ] Dashboard développeur Chrome Web Store (compte déjà payé, S9-bis) →
      New Item → upload `dist/pinkin-v1.0.0.zip` → visibilité **Non-listé**
      → coller les textes/captures de `FICHE_CWS.md` → soumettre pour revue
      magasin.

## 4. Validation OAuth Google (scopes sensibles — Contacts)

- [ ] Google Cloud Console → OAuth consent screen : liens `/privacy` et
      `/terms` sans `.html`, les deux scopes déclarés, statut passé en
      **In production** (préalable au bouton de vérification).
- [ ] Google Cloud Console → OAuth consent screen → soumettre les
      justifications de scope (textes déjà rédigés, honnêtes sur
      l'architecture réelle du secret — voir `JUSTIFICATION_OAUTH.md`),
      coller le lien de la vidéo de démo (étape 2).
- [ ] Attendre le retour Google (délai hors contrôle, itérations possibles).

## 5. Une fois les deux validations obtenues

- [ ] Basculer la visibilité Chrome Web Store de **Non-listé** à **Listé** —
      Pinkin devient public.

---

## Items non bloquants (peuvent attendre après le lancement)

- **Fallback `/api/oauth-config` en dev local** (`pwa/dev-server.js`) —
  affecte seulement `npm run dev:pwa`, pas la soumission. Nécessite de
  décider où vit le secret en dev local (voir `AUDIT_DURCISSEMENT.md` §5) ;
  referme aussi l'échec e2e connu de `oauth-callback.spec.js` en local
  (contourné pour les tests via interception réseau, voir
  `TESTS_DURCISSEMENT.md` — le contournement de test n'a pas besoin de ce
  fallback, seul le confort de dev manuel en a besoin).
- **Re-tester le webhook Cloudflare auto-deploy** maintenant que le repo est
  public (peut-être redevenu fonctionnel).
- **Refactors d'architecture différés** (`ui/orchestrator.js`, mutex de
  refresh dupliqué) — voir `AUDIT_DURCISSEMENT.md` §5, session dédiée.
- **Chantier de professionnalisation cross-projets** — explicitement mis de
  côté par toi pour après le lancement (voir `RETOUR_METHODE_ET_RECOMMANDATIONS.md`).
