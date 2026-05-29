# Note de concept — Pinkin multi-carnets

*Ouverture de Pinkin aux carnets d'adresses communautaires.*

---

## Pourquoi cette note existe

Cette note fige une exploration conceptuelle menée en session #4. Elle n'est
**pas une spécification à construire** : la V1 de Pinkin est livrée sans rien de
ce qui suit. Son rôle est d'être le *filet de continuité* — pour qu'une phase
future puisse rouvrir le sujet sans relire l'historique, et pour que la V1 ne
s'enferme pas par accident dans des hypothèses qui fermeraient cette porte.

Principe directeur : ce qui protège l'évolution n'est pas du code anticipé —
celui-ci vieillirait sans usage et serait probablement faux le jour venu — c'est
**de l'écrit**. La V1 se construit comme si ce document n'existait pas ; la seule
contrainte qu'il lui impose est négative (voir « Ce que ça implique pour V1 »).

---

## Le glissement de fond

Aujourd'hui Pinkin connaît *un seul* carnet — les contacts Google de
l'utilisateur — et tout le code le présuppose : « les contacts », ce sont *tes*
contacts. La vision explorée transforme Pinkin en **client de plusieurs carnets
à la fois** : un carnet personnel + N carnets communautaires.

Ce n'est pas une fonctionnalité de plus. C'est l'introduction d'une entité qui
n'existe nulle part dans `core/model/` aujourd'hui : le **Carnet** lui-même,
comme objet de première classe.

Conséquence à noter : « un onglet Communautés » n'est probablement pas le bon
découpage. Le bon modèle fait apparaître **deux axes orthogonaux** — *quel
carnet* je regarde × *quelle vue* (carte / liste). « Communautés » serait alors
un sélecteur de carnet, pas un troisième onglet frère de Carte et Carnet.

---

## L'entité Carnet et le fournisseur (Source)

Le modèle se structure autour de deux notions :

**Le Carnet.** Une collection de contacts, avec : un identifiant, un type
(`personnel` | `communautaire`), des métadonnées (nom, éventuellement une teinte
de marqueur), une capacité (lecture seule | lecture-écriture).

**Le Fournisseur (`Source`).** Une interface abstraite qui sait *servir* un
carnet. Contrat minimal : lister les membres, lire un membre, donner les
métadonnées du carnet, s'authentifier. Pinkin dépend de cette interface, jamais
d'un fournisseur concret.

L'observation clé : le carnet personnel **et** un carnet communautaire de test
peuvent être servis par la *même* implémentation — `SourceGoogleContacts`. Le
carnet personnel est l'instance branchée sur le compte principal ; un carnet
communautaire de test est une instance branchée sur un second compte Google que
l'utilisateur possède déjà. Cela permet de construire et d'éprouver toute
l'architecture multi-carnets **sans que Freechi existe**.

- **Générique (cœur forkable)** : l'entité Carnet, l'interface `Source`,
  `SourceGoogleContacts`.
- **Spécifique Pinkin/Freechi (déclinaison)** : le fait que Freechi soit un
  fournisseur proposé, la liste-graine de communautés, la copie en français.

Freechi est *un* fournisseur parmi d'autres — jamais câblé en dur.

---

## Les deux étages

Les usages se scindent en deux étages, et cette ligne de partage est la colonne
vertébrale du sujet.

### Étage 1 — Lecture

Consulter des carnets communautaires, en importer des membres, découvrir des
communautés. **Marche contre n'importe quelle source lisible.** Éprouvable
immédiatement, sans Freechi, sans modèle d'exposition. C'est, à lui seul, un
produit : Pinkin garderait toute sa valeur même si l'Étage 2 n'arrivait jamais.

### Étage 2 — Appartenance

Rejoindre une communauté en exposant une partie de soi, synchroniser, créer sa
propre communauté. **Exige une vraie source partagée *et* inscriptible** — donc
un dos applicatif (Freechi ou équivalent). Non éprouvable sans cela.

---

## Les six usages

Au-delà de l'existant (*consulter mon carnet personnel sur la carte*) :

1. **Consulter** — voir sur une carte les membres d'une communauté, sans rien
   copier. *(Étage 1)*
2. **Importer** — verser un membre précis dans mon carnet personnel. Geste
   délibéré, contact par contact. *(Étage 1)*
3. **Découvrir** — parcourir les communautés existantes, choisir lesquelles
   rejoindre. *(Étage 1)*
4. **Rejoindre / exposer** — m'inscrire dans une communauté en choisissant ce
   que je montre de moi. *(Étage 2)*
5. **Synchroniser** — un membre importé reste à jour quand il évolue côté
   communauté. *(Étage 2)*
6. **Créer** — fonder ma propre communauté. *(Étage 2 ; délégué au dos
   applicatif, voir plus bas.)*

---

## « Connecter » = trois opérations distinctes

Le mot « connecter » recouvre trois opérations aux conséquences très
différentes. Les fondre dans un seul bouton serait l'erreur de conception qui
coûte cher plus tard.

- **Consulter** — afficher un carnet communautaire à côté du sien, en lecture
  seule, sans rien copier. Réversible par un clic. Risque quasi nul.
- **Importer** — copier un membre dans le carnet personnel (donc dans Google
  Contacts). Opération à regarder avec méfiance : la copie se périme dès que le
  membre se met à jour, la provenance se perd, le carnet personnel se pollue.
- **Synchroniser** — établir un lien vivant. Généralise l'invariant « source de
  vérité » : *le carnet propriétaire* est la vérité de ses membres.

**Décision retenue** : « connecter » = *s'abonner et consulter*, jamais copier.
L'import reste un geste séparé, conscient, contact par contact.

---

## Découverte des communautés

**Décision retenue** : modèle **décentralisé**. On s'abonne à une communauté en
fournissant son adresse — comme on s'abonne à un flux iCal — sans annuaire
central à curer.

Deux rôles distincts pour la « liste » :

- une **liste-graine** d'exemples livrée avec l'app (config/cœur — déclinaison
  Pinkin/Freechi) ;
- une **liste d'abonnements** personnelle, qui appartient à l'utilisateur et
  grossit avec ses choix.

**Question ouverte** — le stockage durable de la liste d'abonnements.
`localStorage` est purgé à la déconnexion ; les champs `userDefined` de Google
polluent le carnet. C'est le même point dur que celui identifié pour la gestion
de relation. À trancher avant tout code de l'Étage 1.

---

## Étage 2 — familles de solutions

Un carnet communautaire *inscriptible* exige un **état partagé mutable** hébergé
quelque part. Aucune solution n'efface ce constat. L'invariant « zéro serveur »
de Pinkin tient quand même, reformulé précisément : **Pinkin-le-client reste
sans serveur ; le serveur, quand il existe, appartient à la *source*, pas à
Pinkin.** Chaque communauté apporte son dos.

**Famille A — Backend applicatif dédié (modèle Freechi).** Supabase (Postgres +
auth + *RLS*, des règles qui disent « chacun ne modifie que sa ligne, ne voit
que tels champs des autres »). Le modèle d'exposition de l'usage 4 se traduit
directement en politiques RLS. Créer une communauté = insérer une ligne si le
backend est multi-tenant. Faiblesse : un dos applicatif à héberger et maintenir,
et une implémentation neuve sans continuité avec l'Étage 1.

**Famille B — Stockage partagé grand public.** Google Sheet partagé, groupe
Google, fichier sur Drive. Gratuit, hébergé. Mais le partage Google est
*grossier* — autoriser/refuser une ressource entière, pas un champ par membre.
L'usage 4 y est quasi irréalisable proprement. **Écartée pour l'appartenance.**

**Famille C — Carnet en fichiers versionnés (Git + vCard).** La communauté = un
dépôt Git de fichiers vCard, un par membre. Gratuit, open source, historique
natif. Atout majeur : **continu avec l'Étage 1** — la source `.vcf` de l'Étage 1
lit déjà des vCard ; un dépôt Git de vCard, c'est « la même source, distante et
multi-auteurs ». Le chemin de lecture est gratuit ; seul le chemin d'écriture
(publier ma carte = committer mon fichier) est neuf. Granularité du consentement
correcte : *tu possèdes ton fichier*. Faiblesse : identité Git par membre,
friction pour les non-techniciens, dépôt public = géoloc publique.

**Famille D — Protocoles décentralisés.** *CRDT en pair-à-pair* (document
partagé synchronisé entre pairs, sans serveur), *Solid* (chacun possède un
« pod » personnel, la communauté ne fait que référencer les pods — superbement
aligné avec « la donnée appartient au contact »), *Nostr* (relais + événements
signés). Toutes plus pures côté valeurs, toutes immatures pour cet usage. À
connaître, pas à parier dessus en premier.

**Orientation** : ne pas converger sur une solution unique — ce serait contredire
l'interface `Source`. Deux **archétypes** méritent un prototype et se
complètent : l'archétype « backend communautaire » (Freechi/Supabase — riche,
vraie auth, cible réaliste de l'acquisition) et l'archétype « carnet
décentralisé en fichiers » (Git + vCard — fidèle aux valeurs, et continu avec
l'Étage 1).

---

## Le modèle d'exposition (usage 4)

Quel que soit l'archétype, « ce que j'expose » se modélise de la même façon :
**le membre possède sa fiche et n'en publie qu'une *projection*.** En Git, c'est
son fichier ; en Solid, son pod ; en Supabase, sa ligne dont il remplit les
colonnes de son choix. L'usage 4 est donc *concevable dès maintenant*,
indépendamment du backend.

Symétrie à retenir : ce qu'un membre expose en rejoignant (usage 4) est
exactement ce qu'un autre consulte (usage 1) — les deux bouts d'un même contrat.
Un carnet communautaire ne contient que ce que ses membres ont consenti à
montrer ; c'est ce qui rend la consultation légitime sans trahir l'invariant
« vie privée by design ».

**Décision retenue** : le choix de ce qu'on expose se fait à la première
connexion à une communauté, et par communauté.

---

## Identité

L'Étage 2 exige une **identité de membre**. Trois voies, **question ouverte** :

- réutiliser l'identité Google (OAuth) ;
- un compte par communauté ;
- une **identité cryptographique portable** — une paire de clés que l'on
  possède, valable pour signer un commit Git comme pour Nostr ou Solid. C'est la
  plus alignée avec « la donnée appartient au contact » : une seule identité à
  travers tous les types de communauté.

---

## Conséquences techniques connues

À garder en tête le jour où le sujet rouvre :

- **Auth multi-comptes.** Lire un second compte Google suppose de s'y
  authentifier aussi. L'auth durcie en Phase D1 est *mono-compte* (un seul
  refresh token, chiffré AES-GCM). Le multi-carnets fait passer le coffre à
  tokens d'« un token » à « un jeu de tokens, une entrée par source ».
- **Caches clés par source.** `pinkin_geo_cache` et le cache de `contacts-sync`
  devront être indexés par carnet, sinon les carnets se mélangent.
- **Croisement d'identité.** Une même personne présente dans deux carnets
  apparaîtra en double. Résoudre « est-ce le même humain ? » entre carnets est
  un problème en soi. Devient testable tôt avec deux comptes Google.

---

## Décisions prises

- Vues **séparées** par carnet pour démarrer (à revoir : tension vers la
  superposition des carnets sur une même carte).
- « Connecter » = consulter sans copier ; l'import est un geste séparé.
- Découverte **décentralisée** (abonnement par adresse).
- Exposition choisie **à la première connexion**, par communauté.
- Pinkin ne câble **pas** Freechi en dur — interface `Source`, Freechi = un
  fournisseur d'exemple.
- Carnet de test = un **second compte Google** déjà possédé par l'opérateur.
- L'Étage 2 est exploré mais **non lancé** — prématuré.
- La **gestion de relation** (zone `#panel-relationship`) est mise en pause
  derrière ce sujet.

## Questions ouvertes

- Stockage durable de la liste d'abonnements (`localStorage` purgé au logout).
- Auth multi-comptes vs raccourci par carnet `.vcf` exporté — *séquencé* (le
  `.vcf` prouve la couture, le compte Google prouve qu'elle survit à l'auth,
  Freechi prouve qu'elle survit à l'altérité), pas tranché.
- Identité : Google / compte par communauté / paire de clés portable.
- Superposition vs séparation des carnets sur la carte.
- Quel archétype d'Étage 2 prototyper en premier.
- Stratégie de croisement d'identité (dédoublonnage entre carnets).

---

## Ce que ça implique pour V1

Presque rien — et c'est voulu. La V1 se construit sans aucun élément de ce
document. La **seule** contrainte est négative : ne pas enfoncer dans `core/` de
nouvelles hypothèses « mono-compte » qui n'y sont pas déjà. `core/` doit rester
honnête ; il n'a rien à *anticiper*. L'assurance évolution, c'est cette note —
pas du code.

## Position dans les phases

Ce document **ré-conçoit la Porte 2** du brief. La Porte 2 n'est plus « un email
d'invitation façon Plaxo » : c'est l'ouverture multi-carnets décrite ici. Elle
est **différée après la V1** (Phase E — distribution). À reporter dans
`BRIEF_PINKIN.md` lors de sa prochaine mise à jour.
