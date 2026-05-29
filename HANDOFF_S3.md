# HANDOFF — Session #3 : navigation, carnet, fiche compacte

Dernier point de reprise. La session #4 lit `BRIEF_PINKIN.md`, puis `HANDOFF_S2.md`,
puis ce fichier.

Convention de lecture, héritée de #2 et maintenue : **[VÉRIFIÉ]** = constaté à
l'exécution (par l'opérateur, ou par un test automatique) ; **[SUPPOSÉ]** =
correct sur lecture du code et contrôle de syntaxe, mais pas éprouvé en runtime.

---

## Où en est le produit

#3 a fait passer Pinkin d'un écran unique — la carte — à une app à **deux
onglets**. Avant, on n'atteignait un contact qu'en cliquant son marqueur : les
contacts sans position (de l'ordre de 2400 sur 2780) étaient injoignables. C'est
le trou UX nommé en #2. Désormais un onglet **Carnet** liste *tous* les contacts,
filtrable et cherchable, chaque ligne ouvrant la fiche — marqueur ou pas. La
**fiche** a été refondue en carte compacte. Et un défaut bloquant hérité de la
Phase D — la publication des positions dans Google Contacts n'écrivait rien — a
été diagnostiqué et corrigé en préalable.

## Le fil de la session

Le défaut central traité : la **publication écrivait 0 contact**. Cause —
diagnostiquée par la mesure, pas devinée : le garde-fou de précision exigeait le
niveau rue (`place_rank ≥ 22`) ; or un carnet personnel est surtout fait
d'adresses de niveau ville. Sur 263 contacts géocodés, 1 seul atteignait le
seuil. Correctif : seuil abaissé au palier ville (`MIN_PLACE_RANK = 13`), et
`publishGeoCache` ne compte plus les échecs de géocodage dans les « ignorés ».
Résultat constaté : 263 contacts inscrits.

Ensuite, les cinq Étapes du périmètre #3, plus trois correctifs post-parcours
(A, B, C). Le détail est dans la récolte ci-dessous.

## La récolte, par niveaux

### Niveau produit

**Fruits.** Le trou de joignabilité de #2 est refermé : le Carnet atteint
n'importe quel contact. La publication écrit de nouveau. La fiche est lisible —
carte compacte, moyens de contact en pastilles rondes, sections nettes.

**Amélioration à porter.** La gestion de relation (rappels, dernier contact,
notes) n'existe pas : seule une zone vide `#panel-relationship` est réservée
dans la fiche. C'est le gros morceau de #4, et il est non qualifié.

### Niveau architecture & code

**Fruit majeur.** La duplication `extension/popup/popup.html` ↔ `pwa/index.html`
— tension nommée en #2 — est **éliminée**. `ui/shell.js` est la source unique du
DOM ; les deux HTML ne sont plus que des points de montage. Deux primitives
`core/` neuves, génériques et **testées unitairement** : `contact-status.js`
(statut d'un contact) et `vcard-reader.js` (lecture .vcf).

**Nouveaux fichiers.** `ui/shell.js`, `ui/carnet.js`,
`core/services/contact-status.js`, `core/services/vcard-reader.js`.

**Tension non résolue.** `popup.js` et `pwa/app.js` restent des orchestrateurs
quasi-jumeaux : #3 a tué la duplication du *DOM*, pas celle de l'*orchestration*.
Et `app.js` diverge toujours de `popup.js` sur le filtre de géocodage
(`contacts.filter(c => c.needsGeocoding())` au lieu de `pendingGeocodes`) —
divergence repérée en #2, **toujours non corrigée** (volontairement laissée :
volet PWA, son propre jalon).

**Dette mineure.** `package.json` sans `"type":"module"` (avertissement Node,
sans effet navigateur). `extension/main.js` mort, non supprimé (contrainte de
sûreté sur les suppressions de fichiers).

### Niveau méthode

**Fruit.** Contrôle systématisé cette session : `node --check` après chaque
changement, tests unitaires pour les modules purs (`contact-status`,
`vcard-reader`). Et — pour tout changement visuel — une **maquette HTML
autonome** soumise avant de coder : elle a absorbé sans douleur trois directions
visuelles explorées puis abandonnées (JdR, organique, puis compacte retenue).

**Leçon, née d'une erreur.** Sur le défaut de publication, j'ai d'abord propagé
une inférence *fausse* — « le cache est entièrement des échecs » — avant d'avoir
la donnée. L'histogramme des `place_rank` l'a réfutée (263 coordonnées
existaient). Diagnostiquer sur la mesure, jamais sur une déduction partielle.

### Niveau stratégique

**Choix tenu.** Pour les « fonctions de gestion de contact », on a **délégué à
Google Contacts** (un lien « Ouvrir dans Google Contacts ») plutôt que
réimplémenter le CRUD. Ça tient l'invariant « Google = source de vérité » et
n'élargit pas l'usage déclaré du scope écriture — ce qui protège la
vérification OAuth de la Phase E. La Porte 1 (formulaire de self-update du
contact) reste **reportée** : elle exige un backend Freechi.

### Niveau méta

**Contrainte d'outillage durable.** Deux outils font planter l'interface de
l'opérateur : le widget de visualisation *inline* **et** l'outil de questions à
choix multiple. À transmettre à chaque session : visuels livrés en **fichier
HTML autonome**, questions posées **en texte**.

## Vérifié vs supposé — l'état réel à la reprise

**[VÉRIFIÉ]** : correctif du seuil de géocodage (263 contacts écrits, constaté
dans Google Contacts) ; les cinq points [SUPPOSÉ] de #2 ; parité de la coquille
partagée (Étape 1) ; barre d'onglets et libellés ; Carnet — liste, tri, filtre,
recherche, ouverture de fiche depuis un contact hors-carte (Étape 3) ; correctif
A (lien Google Contacts sur le bon compte) ; B (canaux de demande affichés selon
les coordonnées) ; C (fiche compacte, validée visuellement par l'opérateur).
`contact-status` et `vcard-reader` couverts par tests unitaires (7 et 6 cas).
24 fichiers JS — syntaxe vérifiée.

**[SUPPOSÉ]** — corrects sur lecture/contrôle, à éprouver en #4 :
- le `mailto` ouvrant réellement un brouillon — la configuration du gestionnaire
  Gmail a été abandonnée par l'opérateur, le clic n'a donc pas été testé ;
- l'**import .vcf** de bout en bout (sélection du fichier → parse →
  pré-remplissage du formulaire) — jamais exercé en runtime ; seul le parseur
  est testé unitairement ;
- le comportement réel des canaux SMS / WhatsApp de la demande de mise à jour ;
- **tout le volet PWA** — jamais éprouvé une seule fois, depuis le début.

## Décisions en attente / portes ouvertes pour #4

- **Gestion de relation** — la zone `#panel-relationship` est réservée et vide.
  Sa qualification est ouverte, et le **stockage** est le point dur :
  `localStorage` est purgé à la déconnexion ; les `userDefined` Google polluent
  le carnet ; « dernier contact » n'est pas observable par Pinkin. À qualifier
  avant tout code.
- **Vérifier en runtime** le `mailto` et l'import `.vcf` (points [SUPPOSÉ]).
- **Volet PWA** — jamais testé. Soit on l'éprouve, soit on acte explicitement
  qu'on cesse de le maintenir en parallèle tant qu'il ne l'est pas.
- **Porte 1** — reportée (dépend d'un endpoint Freechi).
- **Phase E — distribution** : intouchée (privacy/terms, écran de consentement
  OAuth, soumission Chrome Web Store).
- **Dette mineure** : `package.json` `"type":"module"` ; `extension/main.js`
  mort ; divergence du filtre de géocodage dans `app.js` ; orchestrateurs
  jumeaux `popup.js`/`app.js`.
- **Arbre de travail** : cinq fichiers `mockup-*.html` à la racine.
  `mockup-pinkin-3-rpg.html` et `mockup-pinkin-3-organique.html` sont des
  directions abandonnées — à supprimer. Les autres documentent des décisions.

## Pour démarrer la session #4

Lire `BRIEF_PINKIN.md`, `HANDOFF_S2.md`, puis ce fichier. Première action :
faire confirmer en runtime les points [SUPPOSÉ] (mailto, import `.vcf`). Puis le
gros morceau : **qualifier la gestion de relation**, en commençant par le
problème de stockage — ne pas présupposer qu'elle est prête à démarrer,
conformément au brief.
