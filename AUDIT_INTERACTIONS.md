# Audit méta des interactions — Pinkin

*Session #5. Demande de l'opérateur : remettre en cause toute la gestion des
clics et des interactions de l'interface.*

---

## Méthode et périmètre

Trois passes, sur le code des cinq fichiers d'UI (`orchestrator.js`,
`shell.js`, `carnet.js`, `map.js`, `contact-panel.js`) :

1. **Inventaire** exhaustif des interactions — tout ce qui réagit à un clic,
   une touche, un survol, un geste.
2. **Évaluation heuristique** — cohérence, retour d'information, prévention de
   l'erreur, accessibilité, correspondance au monde réel.
3. **Simulation de parcours** — six trajets utilisateur tracés de bout en bout,
   pour repérer les frottements aux jonctions.

Limite assumée : audit *statique*, sans runtime. Ce qui dépend de l'exécution
(gestes tactiles, latence) est marqué « à éprouver » et renvoyé aux tests
humains.

---

## 1. Inventaire des interactions

| Surface | Élément | Déclencheur | Effet |
|---|---|---|---|
| En-tête | Synchroniser | clic | vide le cache contacts, recharge, re-géocode le manquant |
| En-tête | Écriture | clic | force l'onglet Carte + affiche le bandeau d'écriture |
| En-tête | Déconnexion | clic | `confirm()` natif → révoque + efface les caches |
| Onglets | Carte / Carnet | clic | bascule de vue |
| Accueil | Connecter | clic | lance le flux OAuth |
| Erreur | Réessayer | clic | relance le chargement |
| Carte | marqueur | clic | ouvre la Fiche |
| Carte | fond | clic | ferme la Fiche |
| Carte | marqueur | survol | infobulle (nom) |
| Carte | molette / pincement / glisser | geste | zoom, déplacement (Leaflet) |
| Carnet | recherche | frappe | filtre la liste en direct |
| Carnet | filtre segmenté (3) | clic | Tous / Sur la carte / Hors carte |
| Carnet | ligne contact | clic **ou** Entrée/Espace | ouvre la Fiche |
| Fiche | croix, fond voilé, Échap | clic / touche | ferme la Fiche |
| Fiche | pastilles Joindre | clic | `mailto:` `tel:` `sms:` `wa.me` `signal.me` |
| Fiche | Corriger / Importer .vcf | clic | ouvre le formulaire d'adresse |
| Fiche | Enregistrer / Annuler | clic | écrit dans Google / referme |
| Fiche | Ouvrir dans Google Contacts | clic | nouvel onglet |
| Fiche | canaux « Mise à jour » | clic | message prérempli (e-mail / SMS / WhatsApp) |
| Bandeau | bouton d'écriture | clic | Autoriser / Fermer / Retirer / Réessayer / Réinscrire |

---

## 2. Le constat structurant — les coutures

L'interface a **trois surfaces** : l'en-tête (actions globales), les deux vues
en onglets (Carte, Carnet), et la Fiche (carte modale centrée). Chacune, prise
seule, est correcte. **Le frottement est presque entièrement aux jonctions.**

**2.1 — Carte ↔ Fiche : la Fiche recouvre ce qu'on a cliqué.** La Fiche est une
carte modale *centrée*. Sur la Carte, le marqueur que l'on clique est près du
centre — la Fiche s'ouvre donc pile par-dessus lui. On perd le contexte spatial
au moment précis où on l'examine. C'est le frottement le plus coûteux, et il
rouvre une décision du handoff #3 (« fiche en carte compacte centrée ») — donc
à arbitrer, pas à trancher unilatéralement.

**2.2 — Carnet ↔ Carte : aucun lien.** Ouvrir un contact « Sur la carte » depuis
le Carnet montre une Fiche, jamais sa position. Pour la voir, il faut fermer la
Fiche, basculer sur Carte, et chercher le marqueur des yeux — la carte n'a pas
bougé, rien n'est mis en évidence. Les deux vues d'une même donnée ne se parlent
pas.

**2.3 — En-tête ↔ Fiche : l'en-tête est bloqué quand la Fiche est ouverte.** Le
fond voilé de la Fiche (z-index 1100) recouvre l'en-tête (1000). Tant qu'une
Fiche est ouverte, Synchroniser, Écriture et Déconnexion sont injoignables.
Conséquence directe pour la refonte du contrôle d'écriture : la Fiche dit
« autorise l'écriture via le bouton en haut » — bouton qu'on ne peut pas
atteindre sans fermer la Fiche. Le frottement existe déjà aujourd'hui (le
bandeau du bas est lui aussi sous le voile) ; la refonte est l'occasion de le
résoudre, pas de le déplacer.

**2.4 — La recherche n'existe que dans le Carnet.** Un utilisateur sur la Carte
qui veut joindre « Marie » n'a aucun moyen de la trouver par son nom sans
basculer sur le Carnet. La recherche est une fonction d'app, pas une fonction
du Carnet — son emplacement actuel est un accident d'implémentation.

---

## 3. Cohérence des motifs d'interaction

**3.1 — Deux mesures pour les actions destructrices.** La déconnexion (efface
les caches) demande confirmation par un `confirm()` **natif** du navigateur — une
boîte de dialogue système, étrangère au style de l'app. Le retrait des
localisations (écriture) demande confirmation par un **deux-temps en ligne**
(« Retirer » → « Confirmer le retrait »). Deux gestes destructeurs, deux motifs
de confirmation sans rapport. À unifier sur un seul motif, en cohérence avec le
design system.

**3.2 — La fermeture : exemplaire d'un côté, absente de l'autre.** La Fiche se
ferme de quatre manières cohérentes (croix, fond voilé, Échap, clic sur la
carte) — c'est un modèle. Les bandeaux, eux, n'ont pas de fermeture cohérente :
le bandeau d'écriture se ferme par bascule d'onglet (effet de bord), ou par un
bouton « Fermer » présent dans *certains* états seulement. La refonte du
contrôle d'écriture corrige ce point.

**3.3 — Le retour d'information au clic est inégal.** Synchroniser fait tourner
son icône, les onglets ont un état actif net. Mais la plupart des boutons n'ont
qu'un survol — pas d'état « pressé » ni « en cours ». La refonte du contrôle
d'écriture introduit le bon principe (l'état vit dans le bouton) ; il gagnerait
à être généralisé.

**3.4 — Persistance incohérente de l'état de vue.** L'onglet actif (Carte /
Carnet) persiste d'un chargement à l'autre ; le filtre et la recherche du
Carnet, eux, sont remis à zéro à chaque synchro. Deux choix opposés pour deux
états de vue voisins. Mineur, mais à trancher dans un sens ou l'autre.

---

## 4. Accessibilité des interactions

**Point fort.** Le Carnet est exemplaire : chaque ligne est un `role="button"`,
focalisable au clavier, activable à Entrée **et** Espace. C'est le standard que
le reste devrait suivre.

**Marqueurs de carte — pas d'accès clavier.** Les marqueurs Leaflet ne sont pas
focalisables ; on ne peut ouvrir une Fiche depuis la carte qu'à la souris.
Atténuation réelle : le Carnet, lui, atteint *tous* les contacts au clavier — la
fonction n'est donc jamais hors de portée. À garder tel quel, mais à savoir.

**Fiche modale — pas de piège de focus.** À l'ouverture, le focus va bien sur la
croix ; mais rien n'empêche la tabulation de sortir de la Fiche vers les
éléments derrière le voile. Un `role="dialog"` sans piège de focus est
incomplet. Correctif court.

**Cible tactile.** La media query `@media (max-width:480px)` repasse les boutons
en 44×44 px — la bonne cible. En place, correct ; à éprouver sur la PWA.

---

## 5. Spécifique mobile / PWA

`map.js` initialise Leaflet avec `tap:false` (« on gère les clics nous-mêmes »).
Sur tactile, cela fait reposer l'ouverture d'une Fiche sur l'événement `click`
natif du marqueur — comportement à **éprouver** au test F de la PWA : un
marqueur qui ne répondrait pas au toucher rendrait la carte inutilisable sur
mobile.

L'infobulle de survol d'un marqueur (le nom) n'existe pas sur tactile — pas de
survol. Sur mobile, le seul moyen de connaître le nom derrière un marqueur est
de l'ouvrir. Acceptable, mais à savoir : la carte mobile est plus muette.

---

## 6. Synthèse — pistes d'amélioration, priorisées

| # | Piste | Frottement résolu | Effort | Risque |
|---|---|---|---|---|
| P1 | Contrôle d'écriture en en-tête à état + popover | 2.3, 3.2, 3.3, placement | moyen | faible — déjà maquetté, validé sur le principe |
| P2 | Opt-in d'écriture **dans la Fiche** (bouton propre, pas un renvoi) | 2.3 | faible | faible — se greffe sur P1 |
| P3 | Unifier la confirmation destructive (abandonner `confirm()` natif) | 3.1 | faible | faible |
| P4 | Piège de focus dans la Fiche | accessibilité 4 | faible | faible |
| P5 | Lien Carnet → Carte : ouvrir un contact localisé le centre/met en évidence | 2.2 | moyen | faible |
| P6 | Recherche globale (dans l'en-tête, vaut pour les deux vues) | 2.4 | moyen | moyen — déplace une fonction du Carnet |
| P7 | Fiche : carte modale centrée → tiroir latéral (carte visible) | 2.1 | élevé | moyen — rouvre une décision du handoff #3 |
| P8 | Généraliser le retour « en cours » aux boutons d'action longue | 3.3 | faible | faible |

---

## 7. Séquence recommandée

**Dans V0.2** — ce qui consolide sans rouvrir de grande décision : P1, P2, P3,
P4, P8. Ce sont des gestes de cohérence, faibles en risque ; ils rendent
l'interface propre avant le magasin. P1 + P2 forment un tout (le contrôle
d'écriture, partout cohérent).

**À qualifier à part** — P7 (tiroir vs modale) rouvre un choix délibéré du
handoff #3 : il mérite sa propre maquette et son arbitrage, pas un fourre-tout.
C'est la plus grosse amélioration possible de la relation Carte ↔ Fiche, mais
aussi la plus engageante. Recommandation : la maquetter, décider, puis la placer
soit en fin de V0.2, soit juste après le magasin.

**Après V1** — P5 et P6 sont des enrichissements, pas des corrections de
cohérence. Ils peuvent attendre une version mineure post-lancement sans nuire à
la qualité perçue de la V1.

Aucune de ces pistes n'est tranchée ici : ce document est une base d'arbitrage.
La piste P1 est la seule déjà maquettée (`mockup-pinkin-ecriture.html`) et
validée sur le principe.
