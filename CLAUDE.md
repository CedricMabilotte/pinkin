# CLAUDE.md — pinkin

## routine-fin

Routine de fin de session — checklist de clôture (vérifier l'état publié, nettoyer l'arbre de travail, rafraîchir le point de reprise, lister les décisions en attente, vérifier les artefacts générés, boucle de leçons). À dérouler avant de fermer toute session Cowork.

Fichier : `routine-fin.md`

## Outils d'interface
État des outils d'interface (widget de questions, visualisation inline) : para `resources/shared/faits-execution.md`, daté et rejoué par script — l'ancien bloc « Outils à ne pas utiliser » (sans date ni version) est retiré le 2026-11-04 (revue env. D1-07). Périmètre : Cowork ; raison : règle périmée depuis le retest du 2026-09-07 ; sauf si : un plantage signalé par Ced, à noter dans faits-execution.md avec la version d'app.

## Reprise de session — vérifier les handoffs

Un handoff, ou tout document de passation, est une **suite de claims, pas une
preuve**. Toute affirmation portant sur l'état du *code* — divergences entre
fichiers, fichiers morts, « X est fait », « c'est testé » — se **re-vérifie
contre le code** avant d'être propagée ou utilisée comme base de décision. La
convention [VÉRIFIÉ] / [SUPPOSÉ] des handoffs sert à ça : ne jamais traiter un
[SUPPOSÉ] comme acquis.

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
