# CLAUDE.md — pinkin

## routine-fin

Routine de fin de session — checklist de clôture (vérifier l'état publié, nettoyer l'arbre de travail, rafraîchir le point de reprise, lister les décisions en attente, vérifier les artefacts générés, boucle de leçons). À dérouler avant de fermer toute session Cowork.

Fichier : `routine-fin.md`

## Outils d'interface
État des outils d'interface (widget de questions, visualisation inline) : para `resources/shared/faits-execution.md`, daté et rejoué par script — l'ancien bloc « Outils à ne pas utiliser » (sans date ni version) est retiré le 2026-11-04 (revue env. D1-07). Périmètre : Cowork ; raison : règle périmée depuis le retest du 2026-09-07 ; sauf si : un plantage signalé par Ced, à noter dans faits-execution.md avec la version d'app.

## Reprise de session — vérifier les handoffs

Un handoff est une suite de claims, pas une preuve : règle commune et marqueurs [VÉRIFIÉ] / [SUPPOSÉ] dans para `resources/shared/conventions.md` §« Claims vs preuves » (ce bloc en était une copie mot pour mot ; pointeur posé le 09/11, avis kern).

## Délégation — vérifier d'abord soi-même

Avant de demander une vérification ou une information à l'opérateur, épuiser
d'abord deux sources : (a) ce que les **documents du projet** établissent déjà
(brief, handoffs, plans) ; (b) ce que Claude peut **exécuter ou inspecter
lui-même** — lancer un script ou un contrôle, lire un fichier ou un log, vérifier
un graphe de dépendances. On ne délègue à l'opérateur que ce qui exige vraiment
son contexte, son jugement, ou un accès que Claude n'a pas (compte tiers,
navigateur piloté à la main, runtime non automatisable). Une demande qu'un
document tranchait déjà, ou qu'un contrôle aurait répondue, est une demande de
trop. (Leçon #5 L8.)
## Produit — contrat de vie
Pinkin est le seul *produit* de para : des utilisateurs qui ne sont pas Cedric, des contacts de tiers, trois gardiens externes (Google OAuth, Chrome Web Store, OpenStreetMap). Son contrat de vie fait foi : para `resources/shared/contrats-de-vie/pinkin-produit.md` (v1, 2026-11-08) ; ligne de santé : `pinkin-produit.py --check` (health-check Partie E).
- Pas de nouvel hôte ni de nouveau scope — périmètre : `manifest.json` (`host_permissions`) et écran de consentement OAuth ; raison : un scope ajouté rejoue la vérification Google (deux semaines, rejet d'une vidéo le 2026-10-14) et la promesse publique « zéro serveur » (fiche CWS, /privacy) ne se retire pas ; sauf si : décision explicite de Cedric, écrite d'abord dans le contrat de vie.
- Quand Cedric agit sur le store ou la console OAuth, il le dit dans `etat-projet-pinkin.md` le jour même — périmètre : dashboard CWS, console Google Cloud, où aucune session ne voit rien ; raison : du 31/10 au 07/11 trois sources se contredisaient sur l'état de publication ; sauf si : jamais.
