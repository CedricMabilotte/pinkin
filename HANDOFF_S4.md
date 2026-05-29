# HANDOFF — Session #4 : cadrage de la distribution, extraction de l'orchestrateur

Dernier point de reprise. La session #5 lit `BRIEF_PINKIN.md`, puis `HANDOFF_S3.md`,
puis ce fichier. Deux documents neufs de cette session sont à lire en complément :
`CONCEPT_MULTICARNETS.md` et `PLAN_PHASE_E.md`.

Convention maintenue depuis #2 : **[VÉRIFIÉ]** = constaté à l'exécution (opérateur
ou contrôle automatique) ; **[SUPPOSÉ]** = correct sur lecture du code et contrôle
de syntaxe, pas éprouvé en runtime.

---

## Où en est le produit

La session #4 a été d'abord **conceptuelle et stratégique**, puis a livré un
refactor. Le code fonctionnel n'a pas bougé côté fonctionnalités : ce qui a
changé, c'est qu'on a *cadré la suite* et *consolidé l'architecture*.

Deux décisions de fond. D'une part, la **Porte 2** du brief — le pont vers le
framework Freechi — a été ré-explorée puis ré-conçue : ce n'est plus un email
d'invitation, c'est l'ouverture de Pinkin aux carnets d'adresses communautaires
(Pinkin comme client multi-carnets). Jugée prématurée, elle est **différée après
la V1** et figée dans `CONCEPT_MULTICARNETS.md`. D'autre part, la route vers une
**release publique** a été qualifiée et planifiée dans `PLAN_PHASE_E.md`.

Côté code, la duplication d'orchestration entre l'extension et la PWA — tension
nommée aux handoffs #2 et #3 — est **éliminée**.

## Le fil de la session

Le point de départ était « ajouter un onglet communautés ». La qualification a
montré que ça recouvrait un changement de nature (Pinkin mono-carnet → client
multi-carnets), exploré à fond — entité Carnet, interface `Source`, deux étages
lecture/appartenance, familles de solutions backend. Conclusion partagée : c'est
prématuré. L'opérateur a réorienté vers **finir une V1 et la rendre publique**.

A suivi la qualification de la Phase E : régime OAuth (mode test vs production),
coûts, surfaces de distribution. Le versionnage a été fixé — **V0.1** (actuel) →
**V0.2** (consolidation) → mise en magasin → **V1** (publique). L'extraction de
l'orchestrateur, premier morceau de V0.2, a été lancée et faite. La session
s'est close sur le ménage, les commits, et cette routine de fin.

## La récolte, par niveaux

### Niveau produit

**Fruit.** La route de distribution n'est plus un flou : `PLAN_PHASE_E.md` la
découpe en jalons exécutables, avec coûts (5 $ une fois, le reste gratuit),
choix irréversibles et dépendance critique nommée (la validation OAuth, arbitrée
par Google). La V1 est cadrée : usage personnel d'abord, écriture incluse,
publique après validation et test PWA.

**À porter.** La gestion de relation (`#panel-relationship`) reste en pause,
explicitement, derrière la distribution.

### Niveau architecture & code

**Fruit majeur.** `ui/orchestrator.js` est né : la séquence boot → auth → sync →
géocodage → carte → écriture, qui vivait en double dans `popup.js` et `app.js`,
est désormais une source unique. Les deux fichiers d'entrée tombent à ~25 et ~40
lignes — injection d'auth + un descripteur de surface à quatre champs. Même
geste que `shell.js` pour le DOM. L'extraction est *fidèle* à la version durcie
de `popup.js` ; la seule vraie divergence de surface (l'opt-in : `upgradeScope`
redirige la page en PWA, résout sur place en extension) est isolée en un seam
unique et nommé.

**Ce que ça corrige.** En lisant le code (et non le handoff), on a constaté que
`app.js` n'avait pas qu'une divergence de filtre : c'était un instantané de
`popup.js` d'**avant** le durcissement de la session #2 — pas de `pendingGeocodes`,
pas de `geocodingFinished`, opt-in non durci. L'extraction referme tout ça d'un
coup : la PWA hérite de la version durcie.

**Ménage fait.** `extension/main.js` (mort) supprimé ; `package.json` reçoit
`"type": "module"` ; deux maquettes abandonnées supprimées ; commentaires et
docs périmés corrigés (`core/platform.js`, `README.md`, diagrammes de structure).

### Niveau méthode

**Fruit.** `node --check` passe sur les 24 fichiers JS du projet. L'extraction a
été menée en *copie fidèle* plutôt qu'en refonte — décision assumée pour limiter
le risque d'un refactor non testable en runtime ici.

**Leçon (récurrente).** Le handoff #3 *sous-estimait* la divergence `app.js`. Ce
n'est pas un accident : c'est la troisième fois qu'un handoff propage une
approximation. Voir `lecons-pinkin.md`.

### Niveau stratégique

**Choix tenu.** Pinkin ne câble pas Freechi en dur : l'interface `Source` est
générique, Freechi en serait une implémentation parmi d'autres. Le concept
multi-carnets respecte les invariants (zéro serveur côté Pinkin, la donnée
appartient au contact, forkable).

**Point dur levé.** L'audit de ménage a trouvé deux `CLIENT_SECRET` OAuth réels
en clair dans le code suivi (`auth-worker.js`, `platform-pwa.js`), déjà dans
l'historique git (`db6d9bd`). À trancher avant tout dépôt public — cf.
`PLAN_PHASE_E.md`, questions ouvertes.

### Niveau méta

**Continuité.** Trois documents portent désormais la suite : `CONCEPT_MULTICARNETS.md`
(vision différée), `PLAN_PHASE_E.md` (route de distribution), ce handoff. Le
brief a été mis à jour (Porte 2, état des phases).

**Contrainte d'outillage, maintenue.** Deux outils font planter l'interface de
l'opérateur : le widget de visualisation inline et l'outil de questions à choix
multiple. Visuels en fichier HTML autonome, questions en texte.

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ]** : l'arbre git est propre ; six commits #4 posés ; `node --check`
passe sur tout le JS du projet ; `extension/main.js` absent ; `package.json`
porte `"type": "module"`.

**[SUPPOSÉ]** — corrects sur lecture et contrôle de syntaxe, à éprouver en #5 :
- **toute l'extraction de l'orchestrateur** — boot sur les deux surfaces, le
  chemin de callback OAuth de la PWA, les deux flux d'opt-in. Jamais exécuté ;
- les points [SUPPOSÉ] hérités de #3, toujours ouverts : le `mailto`, l'import
  `.vcf` de bout en bout, les canaux SMS / WhatsApp ;
- le volet PWA — jamais éprouvé une seule fois depuis le début du projet.

## Décisions en attente / portes ouvertes pour #5

- **Dépôt distant** — à créer par l'opérateur (privé recommandé : filet de
  sécurité hors-machine, leçon L1). Push impossible tant qu'il n'existe pas.
- **Secrets OAuth** — à traiter avant tout dépôt public (cf. `PLAN_PHASE_E.md`).
- **V0.2** — le travail de fond suivant, défini dans `PLAN_PHASE_E.md` :
  éprouver en runtime l'extraction + `mailto` + `.vcf`, valider la PWA.
- **Fichiers de tests** — le handoff #3 dit que `contact-status` et
  `vcard-reader` sont couverts par des tests unitaires ; ces fichiers sont
  **introuvables dans l'arbre**. Discrepance à éclaircir.
- **Gestion de relation** — en pause derrière la distribution.
- **Multi-carnets (ex-Porte 2)** — différé après V1, voir `CONCEPT_MULTICARNETS.md`.
- **README §1** — la procédure d'identifiants OAuth a été corrigée ; à
  finaliser quand les clients OAuth définitifs seront créés pour la V1.

## Pour démarrer la session #5

Lire `BRIEF_PINKIN.md`, `HANDOFF_S3.md`, ce fichier, puis `PLAN_PHASE_E.md`.
Première action utile : faire éprouver en runtime l'extraction de l'orchestrateur
(boot extension ET PWA) et les points [SUPPOSÉ] hérités — c'est le cœur de V0.2.
Ne pas ouvrir de phase sans qualification, conformément au brief.
