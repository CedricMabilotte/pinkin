# Routine de fin de session — Cowork

*Checklist de clôture, applicable à toutes les sessions Cowork.*
*À dérouler avant de fermer une session, quel que soit le projet.*

Objectif : ne jamais laisser un projet dans un état flou. Une prochaine
session (ou une autre personne) doit pouvoir reprendre sans relire
l'historique.

La routine s'applique à toute session qui a modifié l'état du projet —
fichiers, données, publication. Une session de pure conversation, sans
changement, n'a rien à clôturer.

---

## Les 6 étapes

### 1. Vérifier l'état publié

Confirmer que ce qui est *en ligne / livré* est cohérent et sans erreur :
dernier commit, dernier run ou build, site ou déploiement à jour. Si un
processus automatisé existe, vérifier que son dernier passage a réussi.

### 2. Nettoyer l'arbre de travail

`git status` doit être propre, ou tout écart doit être assumé :

- committer le travail cohérent et terminé, par étapes lisibles ;
- pour le travail inachevé, soit le committer sur une branche dédiée, soit
  `git stash` avec un message explicite — **jamais** de modifications
  orphelines qui traînent d'une session à l'autre ;
- repérer les fichiers non suivis qui devraient l'être (ou être ignorés).

Règle : à la fin d'une session, rien d'important ne doit exister *uniquement*
dans l'arbre de travail.

### 3. Rafraîchir le point de reprise

Tenir à jour un fichier `etat-projet-<nom>.md` à la racine du projet :
ce qui est fait, ce qui est en cours, ce qui reste en suspens, et les
repères techniques utiles. C'est le document qu'on lit en premier à la
reprise.

### 4. Lister les décisions en attente

Isoler explicitement ce qui requiert un arbitrage humain — choix non
tranchés, options ouvertes, validations externes (un compte, un accès,
une autorisation). Ces points ne doivent pas être noyés dans le reste.

Reprendre aussi les points laissés en suspens par le précédent point de
reprise : dire lesquels ont avancé, lesquels sont clos, lesquels restent
ouverts. Un point en suspens ne disparaît jamais en silence — il est résolu
ou reconduit.

### 5. Vérifier la cohérence des artefacts générés

Quand la session a produit des fichiers dérivés (site, exports, rapports),
vérifier qu'ils correspondent bien aux sources : pas de demi-refactor,
pas de fichier généré désynchronisé de sa source.

Passer également les contrôles automatiques hérités d'anciennes leçons — les
garde-fous ajoutés à l'étape 6 sont là pour rattraper les erreurs déjà
rencontrées une fois.

### 6. Boucler les leçons — et les mettre en œuvre

Repérer une à trois leçons concrètes de la session : un bug silencieux qui
aurait dû être détecté par un contrôle, une étape qui s'est révélée fragile,
une complexité à supprimer, une astuce qui a bien fonctionné.

Une leçon seulement notée ne sert à rien. Pour chacune, trancher un verdict
**dans la session**, jamais un « plus tard » dans le vague :

- **Corriger maintenant** — si la mise en œuvre tient en quelques minutes
  (ajouter un contrôle, supprimer un fichier mort, corriger une commande).
  Une session ne se ferme pas sur une amélioration triviale repoussée : on
  la fait, et la leçon est close le jour même.
- **Tâche** — si la leçon demande un vrai travail, créer une tâche et la
  consigner avec assez de contexte pour être reprise seule : le quoi, le
  pourquoi, le premier pas concret. La verser dans les points en suspens
  (étape 4).
- **Garde-fou** — si la leçon est qu'un contrôle a manqué, l'inscrire comme
  contrôle permanent : dans la vérification de l'état publié (étape 1) ou
  des artefacts (étape 5), ou dans cette routine elle-même. Une leçon de
  processus doit modifier le processus, sinon elle se répétera.

Avant d'appliquer quoi que ce soit, soumettre les leçons et leurs verdicts
proposés à un **choix interactif** : l'arbitrage du quoi-faire revient à la
personne, pas à l'automate. N'appliquer — correctif, tâche ou garde-fou —
qu'après sa sélection.

Tenir un journal cumulatif `lecons-<nom>.md` à la racine du projet. Une
leçon close — corrigée, garde-fou posé, écartée — tient en quelques lignes :
date, énoncé, verdict, statut. Un point resté **ouvert** (tâche, backlog)
doit être autoportant, repris à froid sans rouvrir d'archives : outre
l'énoncé, il porte son **contexte durable** — les fichiers versionnés où vit
le détail, avec leur section précise : un rapport d'audit, un fichier de
config, un hash de commit ; jamais un identifiant de session, support trop
fragile — et sa **reprise** : où lire, quoi vérifier dans l'état courant, et
le premier pas concret. Ce journal se relit **en début de session** : une
leçon ou un point qui réapparaît n'est pas un accident mais un problème de
fond.

---

## Pour rendre cette routine systématique

Cette checklist ne s'applique automatiquement à aucune session : il faut la
déclencher. Deux moyens :

- **Le demander en fin de session** — « déroule la routine de fin de
  session ».
- **L'ancrer dans la mémoire du projet** — la copier dans un fichier
  `CLAUDE.md` à la racine de chaque projet, qui est lu au démarrage de
  chaque session. C'est le moyen le plus fiable pour qu'elle soit appliquée
  sans avoir à y penser.
