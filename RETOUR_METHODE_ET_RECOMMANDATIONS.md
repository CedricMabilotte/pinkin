# Retour de méthode — pinkin → recommandations cross-projets

*Rédigé le 2026-07-17, à la suite de la revue de durcissement du 2026-07-16
(`AUDIT_DURCISSEMENT.md`). Partie 1 : ce que la revue révèle de la méthode de
travail pinkin. Partie 2 : ce qui est transposable au workspace
`Ced_Cabinet/Activities/agents` (lu en lecture seule, rien n'y a été modifié).*

---

## Partie 1 — Comment nous travaillons sur pinkin

### La structure de session

Une session pinkin s'inscrit dans une **chaîne narrative de handoffs** : chaque
handoff prescrit l'ordre de lecture de la reprise (« `BRIEF_PINKIN.md` →
`HANDOFF_S9-ter.md` → ce fichier → `TAF.md` → `lecons-pinkin.md` », fin de
`HANDOFF_S10.md`) et se clôt par « Ne pas traiter un `[SUPPOSÉ]` comme acquis ».
Quatre fichiers pérennes portent l'état : `etat-projet-pinkin.md` (point de
reprise, « le document qu'on lit en premier »), `TAF.md` (backlog À faire /
Fait par session), `lecons-pinkin.md` (journal cumulatif L1-L19, relu en début
de session), et `CLAUDE.md` (règles injectées à chaque démarrage). La clôture
est normée par `routine-fin.md` : 6 étapes — état publié, arbre git propre,
point de reprise, décisions en attente, cohérence des artefacts, boucle de
leçons.

### Les conventions clés

- **[VÉRIFIÉ] / [SUPPOSÉ]** — chaque handoff distingue ce qui a été *constaté à
  l'exécution* de ce qui est *correct sur lecture, non éprouvé*. Corollaire
  (`CLAUDE.md`) : « un handoff est une **suite de claims, pas une preuve** » —
  toute claim sur l'état du code se re-vérifie contre le code (garde-fou L4,
  posé en S4).
- **Boucle de leçons avec verdict tranché en session** (routine-fin étape 6) :
  chaque leçon reçoit un verdict — *corriger maintenant* / *tâche* / *garde-fou*
  — jamais un « plus tard » vague ; « une leçon de processus doit modifier le
  processus ». Exemples aboutis : L2 → section « Outils à ne pas utiliser » du
  CLAUDE.md ; L19 → `scripts/check-smart-quotes.mjs` câblé dans le job CI.
- **Délégation « vérifier d'abord soi-même »** (L8 → `CLAUDE.md`) : épuiser les
  documents et ce que Claude peut exécuter avant de solliciter l'opérateur.

### Où la méthode a tenu

1. **Le [SUPPOSÉ] a conservé le doute pendant 6 semaines.** `HANDOFF_S9-ter.md`
   listait « Service worker PWA s'enregistre » en [SUPPOSÉ], jamais levé.
   L'audit du 2026-07-16 a vérifié (grep `serviceWorker` : une seule occurrence,
   sans rapport) : le SW n'était **jamais enregistré**, la promesse offline-first
   était sans effet. Le tag a empêché de traiter la claim comme acquise et a
   directement orienté la revue (`AUDIT_DURCISSEMENT.md` §1).
2. **La re-vérification des claims attrape à répétition.** L7 : trois claims
   fausses de handoffs/plans attrapées en S5. S9 : contradiction matérielle dans
   `JUSTIFICATION_OAUTH.md` (« pas de client_secret envoyé » — faux, lignes de
   code à l'appui). Audit 2026-07-16 : **deux trouvailles de sous-agents
   invalidées** (CSP « absente » — elle existait dans `pwa/index.html` +
   `_headers` ; « lancer l'E2E à chaque push » — compromis déjà arbitré et
   documenté, L11/L12). Sans re-vérification, on aurait « corrigé » du code sain
   et cassé un arbitrage.
3. **Les leçons deviennent des contrôles permanents.** L18 (rotation de secrets
   zéro-downtime en 7 étapes ordonnées), L19 (guillemets typographiques →
   contrôle CI), L12 (limite 45 s du sandbox → discipline d'annoncer les
   [SUPPOSÉ] dès le cadrage).

### Où la méthode a failli

1. **La routine-fin est déclenchée à la main — et S10 l'a sautée.** Résultat :
   pas de handoff de clôture, `TAF.md` gardait l'i18n en « P0 à ouvrir » alors
   qu'elle était finie, `lecons-pinkin.md` renvoyait vers une L19 inexistante,
   4 commits post-S10 sans narration (détail décisionnel récupérable uniquement
   par `git log -p`). Détecté seulement le 2026-07-16 — `HANDOFF_S10.md` a dû
   être **reconstitué rétroactivement**.
2. **Aucune boucle ne force à lever un [SUPPOSÉ].** Le tag conserve le doute
   mais rien ne programme sa relève : le SW [SUPPOSÉ] a traversé S10 entière ;
   la bascule FR/EN/ES visuelle est [SUPPOSÉ] depuis S10, toujours ouverte.
3. **Aucun contrôle ne vérifie la cohérence croisée des documents.**
   `etat-projet-pinkin.md` disait « repo public : pas encore arbitré » alors que
   `HANDOFF_S9-ter.md` l'établissait en [VÉRIFIÉ] — contradiction vivante
   pendant des semaines. Les 5 documents de haut niveau (`BRIEF_PINKIN.md`,
   `PLAN_PHASE_E.md`…) décrivaient un état **dépassé de 5 sessions** sans aucun
   marqueur — corrigé par des bandeaux « historique/dépassé » à l'audit.
4. **Le travail sur les secrets n'était protégé par aucun test.** L5 : le
   secret initial avait été trouvé « par hasard, par aucun contrôle ». Après la
   voie γ (S9-ter), rien n'empêchait un commit futur de réintroduire un
   `GOCSPX-` — comblé seulement à l'audit (`test/no-hardcoded-secrets.test.js`).
5. **La couverture de tests a suivi les incidents, pas la criticité** :
   `core/auth/pkce-auth.js`, module le plus sensible, n'avait aucun test malgré
   120+ tests ailleurs.

---

## Partie 2 — Recommandations pour les autres projets

Ciblées sur `Activities/agents` (et les repos satellites `claude-sites/`),
priorisées par rapport valeur/coût.

**R1 — Codifier « un rapport de sous-agent = une suite de claims » +
[VÉRIFIÉ]/[SUPPOSÉ] comme convention transverse.**
*Problème* : trouvailles de sous-agents ou claims de handoffs propagées sans
re-contrôle. *Pinkin* : 2 trouvailles sur 5 revues invalidées à la
vérification ; L4/L7. *Côté agents/* : **pratiqué mais non codifié** — la
session @kern du 2026-06-02 note que « la re-vérification a infirmé plusieurs
faux positifs de l'audit », mais ni `conventions.md`, ni la DoD, ni les manuels
d'orchestration du 2026-07-16 ne portent la règle (grep [VÉRIFIÉ]/[SUPPOSÉ] :
zéro occurrence normative). *Mise en œuvre* : ajouter une section « Claims vs
preuves » à `resources/shared/conventions.md` (reprendre le texte du CLAUDE.md
pinkin, §« Reprise de session ») + une case au socle commun de
`definition-of-done.md` : « toute trouvaille de sous-agent utilisée comme base
d'action est re-vérifiée ou marquée [SUPPOSÉ] ».

**R2 — Boucle de relève des [SUPPOSÉ] / points en suspens à l'ouverture.**
*Problème* : un doute étiqueté mais jamais programmé survit indéfiniment.
*Pinkin* : SW [SUPPOSÉ] de S9-ter au 2026-07-16. *Côté agents/* : partiellement
couvert — « Restent dus » de l'état vivant et « En attente de Ced » d'`agora.md`
tracent les décisions, pas les doutes techniques non éprouvés. *Mise en œuvre* :
dans `session-manager/session-end.md`, ajouter à la confirmation structurée
(étape 6) une ligne `SUPPOSÉS :` listant les claims non éprouvées ; règle
d'ouverture (manuel §reprise) : chaque suspens du journal précédent est **levé
ou reconduit explicitement** — jamais disparu en silence (routine-fin pinkin,
étape 4).

**R3 — Scan de contenu des secrets, pas seulement des noms de fichiers.**
*Problème* : la détection sensible de `/session-end` (étape « Détection
fichiers sensibles ») et de la DoD filtre par **motif de nom** (`.env`,
`credentials*`…) ; un secret collé dans un fichier ordinaire passe. *Pinkin* :
L5 (secret trouvé par hasard), puis `test/no-hardcoded-secrets.test.js` (motif
`GOCSPX-`). *Côté agents/* : **nouveau**. *Mise en œuvre* : ajouter au bloc
bash de `session-end.md` (ou à `/kern-comb`) un grep des fichiers stagés sur
les préfixes stables (`GOCSPX-`, `sk-`, `ghp_`, `AKIA`, `BEGIN PRIVATE KEY`) ;
pour les repos de sites avec CI, dupliquer le test pinkin.

**R4 — Verdict de leçon tranché en session (corriger / tâche / garde-fou).**
*Problème* : leçons notées sans transformation en contrôle → répétition.
*Pinkin* : routine-fin étape 6 ; L19 → contrôle CI. *Côté agents/* :
**largement couvert** — carnet MARS-strat avec critères de promotion, journaux
`lecons-eozen.md`/`lecons-communs.md`, étape 2.6 evolve/develop de
`/session-end`, pre-commit régénérant les fiches. Ce qui manque : le **tri à
trois verdicts** explicite et la règle « une leçon de processus modifie le
processus ». *Mise en œuvre* : insérer ce tri dans l'étape 2.6 de
`session-end.md` (trois lignes).

**R5 — Bandeau « historique/dépassé » sur les docs supplantés non archivés.**
*Problème* : documents de cadrage dépassés lus comme source de vérité.
*Pinkin* : 5 docs dépassés de 5 sessions → bandeaux pointant la source courante,
avec nuance (« conception encore valide », pas rejet en bloc). *Côté agents/* :
couvert pour le carnet (cascade vers `archives/`) et par la frontière
carnet↔agora, mais des docs supplantés restent en place sans marqueur (ex. la
« structure v2 supplantée — à archiver », item ouvert depuis 2026-06-02).
*Mise en œuvre* : convention légère dans `conventions.md` — tout doc supplanté
qui reste en place reçoit en tête « Historique — supplanté par X le AAAA-MM-JJ,
encore valide pour Y » ; à terme, champ frontmatter `statut: supplanté`
vérifiable par `/kern-comb`.

**R6 — Généraliser le check anti-guillemets-typographiques aux repos de sites.**
*Problème* : un outil d'édition peut substituer U+2018/U+2019 aux délimiteurs
de chaîne — casse silencieuse en prod (écran blanc, aucune erreur en sandbox).
*Pinkin* : incident S10, L19, `scripts/check-smart-quotes.mjs` en CI. *Côté
agents/* : **rien d'équivalent**, et les sites (goorg, planb, freechi…) mêlent
massivement texte français à guillemets typographiques légitimes et code
`.js`/`.astro`. *Mise en œuvre* : copier le script pinkin dans chaque repo de
site, exclure les dossiers de contenu (`src/content/`, `pages/`), câbler dans
le build.

---

*Le fil rouge des six : pinkin montre qu'une convention ne vaut que câblée dans
un contrôle qui s'exécute (CI, script de clôture, checklist injectée) — et que
même alors, le maillon faible reste le déclenchement humain de la routine de
clôture. C'est le seul point qu'aucun des deux workspaces ne résout encore.*
