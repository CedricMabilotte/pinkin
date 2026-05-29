# Leçons — pinkin

Journal cumulatif des leçons de session (routine-fin, étape 6). À relire en
début de session : une leçon qui réapparaît signale un problème de fond.

Format d'une entrée : énoncé · verdict · statut.

---

## Session #3 — 2026-05-24

**L1 — Le projet n'était pas versionné.** Quatre sessions de travail
substantiel vivaient uniquement dans l'arbre de travail, sans historique ni
filet de sécurité.
Verdict : *corriger maintenant*. Statut : **clos** — dépôt git initialisé,
premier commit `db6d9bd`, `.gitignore` posé.

**L2 — Deux outils font planter l'interface Cowork de l'opérateur** : le rendu
de visuel inline (widget de visualisation) et l'outil de questions à choix
multiple. Redécouvert plusieurs fois au fil de la session, faute de trace.
Verdict : *garde-fou*. Statut : **clos** — section « Outils à ne pas utiliser »
ajoutée aux 10 fichiers `CLAUDE.md`, lus au démarrage de chaque session.

**L3 — Diagnostiquer sur la donnée, pas sur la déduction.** Sur le défaut de
publication (0 contact inscrit), une cause fausse a été affirmée par
raisonnement avant que la mesure (l'histogramme des `place_rank`) ne la réfute.
Verdict : *écartée* — l'opérateur juge que ça ne mérite pas une règle
permanente. Statut : **clos**.

---

## Session #4 — 2026-05-25

**L4 — Le handoff sous-estime, encore.** Le handoff #3 réduisait la divergence
`pwa/app.js` ↔ `popup.js` à un filtre de géocodage ; la lecture du code a montré
un instantané entier d'avant le durcissement de la session #2 (filtre
`pendingGeocodes`, drapeau `geocodingFinished`, opt-in durci — tous absents).
Troisième session de suite où un handoff propage une approximation.
Verdict : *garde-fou*. Statut : **clos** — section « Reprise de session —
vérifier les handoffs » ajoutée à `CLAUDE.md` : toute claim sur l'état du code
se re-vérifie contre le code.

**L5 — Un secret OAuth dormait dans l'historique git.** Deux `CLIENT_SECRET`
réels, en clair dans le code suivi (`extension/background/auth-worker.js`,
`pwa/platform-pwa.js`), committés depuis `db6d9bd` ; trouvés par hasard pendant
l'audit de ménage, par aucun contrôle.
Verdict : *tâche*. Statut : **clos** (#5) — le dépôt distant a été créé privé et
le reste en permanence (confirmé par l'opérateur) ; le risque propre au dépôt
public ne se matérialise donc pas.

**L6 — Des tests unitaires fantômes.** Le handoff #3 dit `contact-status` et
`vcard-reader` couverts par des tests unitaires (7 et 6 cas) ; ces fichiers sont
absents de l'arbre. Illustration directe de L4.
Verdict : *tâche*. Statut : **clos** (#5) — vérifié : aucun fichier de test n'a
jamais existé dans l'historique git (la claim #3 était fausse). Tests recréés :
36 cas (`contact-status`, `vcard-reader`, `contact`, `geopoint`), `npm test`.

---

## Session #5 — 2026-05-26

**L7 — Les claims de plan/handoff encore périmées — mais le garde-fou a tenu.**
Trois claims fausses rencontrées : les tests unitaires « existants » du handoff
#3 n'avaient jamais existé ; les « préalables matériels » de `PLAN_PHASE_E.md`
(Leaflet local, icônes PNG, CLIENT_ID) étaient déjà faits. La re-vérification
systématique exigée par le garde-fou L4 les a TOUTES attrapées avant qu'elles ne
soient propagées ou utilisées comme base de décision.
Verdict : *garde-fou — déjà en place, et efficace*. Statut : **clos** — L4 tient ;
rien à ajouter, à reconduire.

**L8 — Déléguer à l'opérateur des vérifications faisables soi-même.** Claude a
re-listé à l'opérateur la configuration Google Cloud (déjà documentée comme
faite dans `BRIEF_PINKIN.md`), et lui a demandé des tests dont une partie était
auto-vérifiable — routage du serveur de dev, complétude du graphe d'assets de la
PWA — faits ensuite par Claude une fois le point soulevé par l'opérateur.
Verdict : *garde-fou*. Statut : **clos** (#5) — section « Délégation — vérifier
d'abord soi-même » ajoutée au `CLAUDE.md` du projet (lue au démarrage de chaque
session) : avant de demander une vérification à l'opérateur, épuiser d'abord ce
que les documents établissent et ce que Claude peut exécuter ou inspecter
lui-même.

**L9 — Le bac à sable bash de Cowork ne persiste pas les processus.** Un serveur
lancé en arrière-plan dans un appel bash ne survit pas à la fin de l'appel
(plusieurs tentatives `nohup`/`setsid` infructueuses avant de le constater).
Conséquence : Claude ne peut pas garder un serveur en vie pour piloter un
navigateur dessus en plusieurs étapes — il faut soit tout faire dans un seul
appel, soit que l'opérateur lance le serveur.
Verdict : *garde-fou — consigné ici*. Statut : **clos** — ce journal, relu en
début de session, est le garde-fou ; ne pas re-tenter de détacher un processus.

Note de suivi #6 : Playwright résout ce point par sa clé `webServer`
(`reuseExistingServer: true`) — il démarre `dev:pwa` à la demande si absent,
ou utilise celui de l'opérateur s'il tourne déjà. Pas de processus à
maintenir entre appels.

---

## Session #6 — 2026-05-26

**L10 — After-edit checkpoint : `git diff` après un lot d'edits.** Cas vécu
sur `package.json` en #6 : un linter a réécrit le fichier entre mon `Read`
et mon `Edit` ; l'outil a retourné « file has been modified since read » au
milieu d'un lot d'éditions, retour que je n'ai pas remarqué. Conséquence :
le script `test` est resté `node --test` au lieu de devenir `vitest run`.
Diagnostic à rebours via la stack `npm test` plantant sur des imports
vitest dans des fichiers lancés par `node --test`.

Verdict : *garde-fou*. Statut : **clos** (reformulé Lot 3 #7). Règle
opérationnelle, moins coûteuse que « relire chaque Edit » : **après un lot
d'edits sur un même fichier, un `git diff` rapide AVANT d'en sortir** —
c'est là qu'un edit silencieusement raté apparaît, et c'est là que la
correction est triviale plutôt qu'à rétroinger dans un debug d'aval. Sans
ça, le défaut ne se révèle qu'à l'exécution, plusieurs étapes plus loin,
sur une stack confuse. (Apparenté à la règle « commit checkpoint » de la
routine de fin — ici déclinée à l'échelle micro d'un fichier touché.)

---

## Session #8 — 2026-05-27

**L11 — Sandbox parallélisation E2E : 2 workers maximum.** Cas vécu en
fin de #8 sur la suite `pwa-headless` : les mêmes 14 specs qui passaient
14/14 vert en début de session (stats JSON `expected=14 unexpected=0`)
deviennent flaky à 4 workers en fin de session — 3 à 5 tests timeout à
35 s, retry échouent aussi. Sous 2 workers, les mêmes specs repassent
toutes vertes en ~13 s. Aucun changement sur les fichiers spec ni sur
le code app entre les deux runs.

Diagnostic : `pwa/dev-server.js` mono-threadé sature au-delà de 2-3
chargements concurrents dans le sandbox Cowork (plus contraint que la
machine de l'opérateur, où #7 avait constaté que 4 workers tenaient).
Le retry Playwright ne suffit pas parce que la saturation persiste tant
que les workers concurrents continuent à frapper.

Verdict : *garde-fou code* (option a, arbitrée par l'opérateur en
clôture #8). Statut : **clos** — `playwright.config.js` baisse de
`workers: 4` à `workers: 2` hors-CI (CI reste à 1). La suite tourne en
~30 s au lieu de ~15 s côté opérateur, mais Claude et opérateur
partagent désormais le même comportement, plus de divergence à
diagnostiquer à rebours. CI inchangée (workers: 1 + retries: 2,
décision #6).

---

## Session #9 — 2026-05-28

**L12 — Sandbox Cowork : timeout 45 s par appel bash, conséquence pour
Playwright E2E.** Cas vécu en S9 sur deux suites E2E :
- `pwa-headless` (14 tests) démarre mais ne tient pas dans la fenêtre 45 s
  du sandbox (~30 s côté opérateur post-L11, plus boot serveur + chromium).
- `extension` (1 test) tient en ~30 s sans retry mais avec un retry par
  défaut (35 + 35 = 70 s) dépasse aussi.

Conséquence pour Claude en Cowork : la couche E2E n'est vérifiable
soi-même que par sous-paquets ≤ 6-7 tests, sans retry, ciblés. Pour
re-confirmer 14/14 ou 10/10 d'une suite complète après une modif, il
faut soit splitter, soit déléguer à l'opérateur en clôture, soit
accepter une marque `[SUPPOSÉ]`.

Verdict : *garde-fou de méthode — consigné ici*. Statut : **clos** — la
discipline de session intègre désormais : ne pas s'engager à re-vérifier
en runtime une suite E2E complète en sandbox Cowork ; annoncer dès le
cadrage si la re-vérif sera déléguée à l'opérateur. La couche unit/DOM
(120 tests en 1,3 s) reste pleinement vérifiable à chaque modif.

**Trouvaille S9 — claims stales attrapées par L4 (sans nouvelle leçon).**
Deux écarts trouvés à la reprise et corrigés sans escalade :
- HANDOFF_S8 dit « 117 tests unit/DOM » en tête puis « 120 » dans le corps
  — vraie valeur : 120.
- `JUSTIFICATION_OAUTH.md` disait « Pas de client_secret envoyé depuis
  le navigateur » — faux : le code embarque le secret et l'envoie à
  l'échange (`extension/background/auth-worker.js` l. 33, `pwa/platform-pwa.js`
  l. 28, `core/auth/pkce-auth.js` l. 102 et 127). Une contradiction qui
  aurait pu faire rejeter la validation OAuth si un réviseur Google
  inspectait. Réécriture honnête, pointage du module + en-tête.
L4 (garde-fou en place depuis #3) tient et continue de produire de la valeur.

---

## Session #9-ter — 2026-05-29 (MARS-prod critique site)

**L13 — Pivot d'hébergeur → re-audit éditorial obligatoire.** En S9-bis et
S9-ter, le passage à Cloudflare a été techniquement réussi (HTTPS, sécurité,
mail préservé, custom domain bind), mais l'audit éditorial des pages SERVIES
sur le nouveau domaine n'a pas été refait. L'opérateur a découvert au coup
d'œil que privacy/terms étaient mono-langues et orphelines (pas de switcher,
pas de footer riche) — alors que ces écarts existaient déjà dans le repo S8
mais étaient masqués par le fait qu'aucune passe « ouvre le site final »
n'avait été déclenchée. La passe MARS-prod en S9-ter a tout remonté.

Verdict : *garde-fou de méthode*. Statut : **clos** — la routine-fin Pinkin
intègre désormais une étape « lancer une passe MARS-prod sur le rendu final
si une session a touché l'infrastructure de livraison ». Une session « ship »
n'est pas finie tant qu'on n'a pas vu le rendu final livré.

**L14 — `start_url` du manifest PWA pointe sur l'app installée, jamais sur
la marketing landing.** Pinkin V1.0 expédiait `manifest.webmanifest` avec
`start_url = "/"` — un utilisateur qui installe la PWA depuis Chrome se
retrouvait sur la landing au lieu de la carte. Corrigé en S9-ter à `/pwa/`.

Verdict : *garde-fou*. Statut : **clos** — règle V1 : à chaque release,
re-vérifier que `start_url` matche l'URL d'usage réel de l'app (`/pwa/` pour
Pinkin, `/app/` pour d'autres conventions, etc.). À intégrer au script
`pack-extension.sh` plus tard comme contrôle défensif # 9 (lecture du
manifest.webmanifest, vérification du start_url).

**L15 — « Code source » dans un footer pointe vers le repo, ou disparaît.**
Pinkin V1 affichait « Code source » dans le footer de la landing → lien
vers `github.com/CedricMabilotte/` (le profil GitHub de l'auteur, pas le
repo `pinkin` qui est privé). Trompeur dès lors qu'on a tranché S9-bis
« repo reste privé pour préserver L5 ». Solution court terme : retirer le
lien (fait S9-ter). Solution long terme : voie 2 héritée S9-bis
(régénération secrets + repo public) — à arbitrer plus tard.

Verdict : *correction immédiate*. Statut : **clos** (court terme).
Ré-ouvrir si l'opérateur décide la voie 2.
