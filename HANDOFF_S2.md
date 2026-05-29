# HANDOFF — Session #2 : verrouillage de l'extension

Ce document remplace `HANDOFF_D1.md` comme dernier point de reprise. La session #3
le lit après `BRIEF_PINKIN.md`. Il fait aussi office de **récolte** : ce qu'on a
gagné, ce qu'on a appris, ce qu'on pourrait encore alléger.

Convention de lecture : chaque affirmation porte une étiquette quand son statut
n'est pas évident — **[VÉRIFIÉ]** = constaté à l'exécution par l'opérateur,
**[SUPPOSÉ]** = juste correct sur lecture du code, pas encore éprouvé. Cette
distinction est elle-même une leçon de la session (voir niveau méta).

---

## Où en est le produit

L'extension n'est plus une popup fugace : elle s'ouvre comme un onglet stable,
géocode un gros carnet en reprenant proprement après interruption, mémorise les
adresses non géolocalisables pour ne pas les retraiter, et propose un opt-in
d'écriture honnête, réversible et — désormais — clairement libellé. Le formulaire
de correction d'adresse est passé d'une ligne agglutinée à cinq champs
structurés. Le scope « verrouiller l'extension » de la session est traité de bout
en bout. Ce qui reste relève de la distribution, de la porte Freechi, ou du volet
PWA jamais éprouvé.

---

## Le motif central de la session

Une seule cause racine explique presque tous les bugs traités : **un résultat
asynchrone qui ne survit pas au franchissement d'une frontière de cycle de vie.**

La popup mourait au changement de focus, et avec elle l'écriture finale du cache.
L'accusé de réception d'`upgradeScope` se perdait quand le service worker était
recyclé pendant le long flux de consentement. Et au dernier point traité, c'est
une frontière d'un autre genre — entre deux *écrans* — qui rompait le fil : la
fiche contact et le bandeau ne nommaient pas la permission avec les mêmes mots.

La leçon, réutilisable bien au-delà de Pinkin : **ne jamais faire confiance à un
accusé de réception ; la vérité est dans l'état persisté.** Un acquittement est
une promesse faite *avant* la frontière ; l'état persisté est un fait constaté
*après*. À chaque fois qu'on a remplacé le premier par le second — persistance
par contact plutôt que sauvegarde finale, `getStatus()` plutôt que le retour
d'`upgradeScope` — le bug a disparu.

---

## La récolte, par niveaux

### Niveau produit

**Fruits.** Une surface d'application stable (onglet singleton, focalisé s'il
existe déjà) ; un géocodage réellement reprenable ; un opt-in transparent et
réversible ; un formulaire d'adresse structuré qui, en prime, géocode mieux —
une requête structurée se résout plus finement qu'une chaîne agglutinée.

**Leçon.** La mémoire d'échec est indexée sur la *requête d'adresse*, pas sur le
contact : un contact dont l'adresse reste inchangée est ignoré au resync, mais si
l'utilisateur corrige son adresse, la clé change et le contact est re-géocodé.
La réversibilité fine se gagne en choisissant la bonne clé, pas en ajoutant du
code.

**Amélioration à porter.** Le plus gros trou UX restant : on n'ouvre la fiche
d'un contact qu'en cliquant son marqueur sur la carte. Les contacts non
géolocalisables — les ~123 — n'ont pas de marqueur, donc sont **injoignables**.
La fonction « corriger l'adresse » ne peut pas atteindre les contacts qui en ont
le plus besoin. Il manque une vue liste ou une recherche. À qualifier en #3.

### Niveau architecture & code

**Fruit.** Le bandeau d'écriture est une fonction unique multi-états
(`showWriteBanner`) : transparence et réversibilité tiennent dans un seul endroit.
Bonne consolidation, à garder.

**Simplification déjà faite.** Le géocodeur est passé de « lot de 10 + sauvegarde
finale » à « sauvegarde après chaque contact ». Moins de code, et durable face au
pire événement de cycle de vie. Le principe : préférer le modèle de durabilité le
plus simple qui survit au pire.

**Simplification encore possible.** `pinkin_geo_cache` mélange deux formes dans un
même store : les géoloc `{lat,lng}` et les échecs `{failed,query}`. On les
distingue par `typeof cached.lat === 'number'`. Ça marche mais c'est implicite ;
une forme unique avec un champ discriminant explicite serait plus lisible. À
peser, sans urgence.

**Tension à nommer.** Le markup du formulaire d'adresse est dupliqué entre
`extension/popup/popup.html` et `pwa/index.html` alors que `ui/contact-panel.js`
est partagé. Toute évolution du formulaire doit toucher deux fichiers — source
silencieuse de divergence (déjà rencontrée cette session). Un template injecté
par JS supprimerait la duplication, au prix d'un peu de machinerie. Tension, pas
mandat.

### Niveau méthode & collaboration

**Fruit.** Le mode du brief — qualifier avant de démarrer, commenter chaque bloc,
nommer les choix — a payé : c'est en re-diagnostiquant au lieu de faire confiance
qu'on a trouvé les vraies causes.

**Leçon, née d'une erreur.** J'ai répété une affirmation fausse de
`HANDOFF_D1.md` (« la reprise du géocodage fonctionne »). L'opérateur l'a
corrigée par le test. Un document de passation est une *suite de claims*, pas une
preuve. D'où la convention [VÉRIFIÉ]/[SUPPOSÉ] de ce handoff-ci.

**Leçon d'interface.** L'outil de questions à choix multiple fait planter
l'interface de l'opérateur : toutes les questions se posent en texte. Contrainte
durable, à transmettre à chaque session.

### Niveau stratégique — Freechi & distribution

**Fruit.** Le séparation config/core tient : ce qui est spécifique à la déclinaison
Freechi (palette pink, libellés) reste cantonné, le cœur reste forkable. Aucune
dette nouvelle de ce côté cette session.

**Point d'attention pour la Phase E.** Nommer les *deux* usages du scope écriture
dans le bandeau d'opt-in n'est pas que de l'UX : l'écran de consentement OAuth
que Google validera pour le Chrome Web Store exige que l'usage déclaré du scope
soit exact et complet. La copie corrigée prépare déjà cette justification.

### Niveau méta — usage de Claude & continuité

**Fruit.** Les fichiers de passation sont le mécanisme de continuité du projet.
Ils fonctionnent — à condition de distinguer le vérifié du supposé. Sans cette
étiquette, un handoff propage ses erreurs à la session suivante (c'est arrivé).

**Amélioration de routine.** Toute session future devrait clôturer comme
celle-ci : une récolte qui sépare explicitement fruits / leçons / améliorations /
simplifications, et qui marque le statut de chaque claim.

---

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ] à l'exécution par l'opérateur :**
surface onglet et singleton ; reprise du géocodage avec persistance par contact ;
mémoire d'échec (123 contacts retraités une fois puis ignorés au resync) ;
message « adresse verrouillée » de la fiche.

**[SUPPOSÉ] — correct sur lecture, pas encore éprouvé en runtime :**
durcissement de l'opt-in (relecture via `getStatus()`) ; bilan de publication
persistant (bouton « Fermer », plus d'auto-masquage) ; chemin d'écriture du
formulaire d'adresse structuré ; connexion à froid ; **et le libellé du bandeau
d'opt-in modifié en toute fin de session** (« Autoriser l'écriture », double
usage nommé). Ces cinq points sont la première chose à faire vérifier en #3.

---

## Portes ouvertes pour la session #3

- **Vérification runtime** des cinq points [SUPPOSÉ] ci-dessus — préalable à tout.
- **Joignabilité des contacts hors-carte** : vue liste ou recherche, pour
  atteindre les contacts sans marqueur. Plus gros trou UX restant.
- **Phase E — distribution** : `/privacy`, `/terms`, écran de consentement OAuth,
  soumission Chrome Web Store.
- **Phase D2 — porte 2 Freechi** : le pont d'acquisition vers le framework parent.
- **Volet PWA** : jamais éprouvé une seule fois.
- **Reporté explicitement** : Porte 1 (« demander au contact de mettre à jour sa
  fiche ») ; cache géo indexé par compte qui survivrait à la déconnexion (le
  comportement actuel — purge au logout — a été compris et accepté tel quel).

## Pour démarrer la session #3

Lire `BRIEF_PINKIN.md`, puis ce fichier. Commencer par faire confirmer à
l'opérateur les cinq points [SUPPOSÉ]. Ne pas ouvrir de phase nouvelle sans
qualification profonde, conformément au brief.
