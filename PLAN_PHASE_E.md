# Plan — Phase E : distribution de Pinkin

*Point de reprise prêt à exécuter. Issu de la qualification menée en session #4.*

---

## Objet

La Phase E mène Pinkin de l'état actuel — fonctionnel mais jamais distribué — à
une **release publique**. Elle est découpée en jalons explicites, parce qu'on ne
publie pas un code qui porte encore des points non éprouvés.

Régime OAuth : Pinkin reste en **mode test** jusqu'à la validation Google. La
publication grand public n'arrive qu'avec V1.

---

## Trajectoire

```
V0.1            V0.2                  Mise en magasin        V1
(actuel)   →    (consolidation)   →   (non-listé)        →   (release publique)
```

- **V0.1** — état actuel : extension fonctionnelle en chargement non empaqueté,
  OAuth en mode test, PWA jamais éprouvée.
- **V0.2** — consolidation : barre de qualité avant de toucher au magasin.
- **Mise en magasin** — extension publiée *non-listée* ; OAuth toujours en mode
  test ; validation OAuth lancée en parallèle.
- **V1** — validation OAuth obtenue → bascule en *listé*, public. PWA déployée.

---

## V0.2 — Consolidation

Objectif : qu'aucun point non éprouvé ni aucune divergence connue ne subsiste
avant la mise en magasin.

### Contenu

**Éprouver en runtime** — les points marqués `[SUPPOSÉ]` au handoff #3, jamais
exécutés :
- le `mailto` ouvre-t-il réellement un brouillon ;
- l'import `.vcf` de bout en bout (sélection → parse → pré-remplissage) ;
- le comportement réel des canaux SMS / WhatsApp de la demande de mise à jour.

**Valider la PWA** — la faire tourner pour la première fois depuis le début du
projet, et corriger ce que ça révèle.

**Extraire l'orchestrateur partagé** — `extension/popup/popup.js` et
`pwa/app.js` sont des orchestrateurs quasi-jumeaux : ils pilotent la même
séquence boot → auth → sync → géocodage → carte → état d'écriture. Constat de
session #4, vérifié sur le code : `app.js` est un instantané de `popup.js`
*d'avant le durcissement de la session #2* — il lui manque le filtre
`pendingGeocodes`, le drapeau `geocodingFinished`, l'opt-in durci (`getStatus()`
relu après `upgradeScope`) et les bilans persistants.

Décision : **extraire la séquence d'orchestration dans un module partagé**
(`core/` ou `ui/`), que les deux surfaces appellent. `popup.js` et `app.js` ne
gardent que leurs parts réellement spécifiques : l'auth injectée
(`ExtensionAuth` / `PWAAuth`), l'`assetBase`, et le rattrapage du callback OAuth
propre à la PWA. C'est le même geste que `ui/shell.js` a fait pour le DOM.
L'extraction résorbe *du même coup* la divergence et le déficit de durcissement
de la PWA — la synchronisation manuelle des jumeaux a déjà échoué une fois, ce
n'est plus une hypothèse.

**Ménage** — supprimer le fichier mort `extension/main.js` (vérifié : chargé par
personne ; `popup.html` charge `popup.js` directement, qui fait lui-même
`Platform.auth = ExtensionAuth`) ; ajouter `"type": "module"` à `package.json`
(silence un avertissement Node sur les tests, sans effet navigateur). Script de
nettoyage fourni à part.

### Contrôles

`node --check` sur tout fichier touché ; tests unitaires existants
(`contact-status`, `vcard-reader`) verts ; commit par étapes lisibles.

### Critères de sortie

Extension et PWA passent la **même** séquence durcie ; `mailto` et import `.vcf`
confirmés en runtime ; arbre de travail propre ; dépôt git committé.

### Déjà acquis (constaté cette session)

- Le champ `key` est **déjà présent** dans `manifest.json` — l'ID de l'extension
  est donc déjà stable et survivra au passage chargement non empaqueté → magasin.
  L'item « fixer le `key` » est clos avant de commencer.
- Les deux maquettes abandonnées sont **déjà supprimées** — il ne reste à la
  racine que des maquettes qui documentent des décisions.

---

## Mise en magasin (non-listé)

Ne démarre qu'après V0.2.

### Préalables matériels

- **Installer Leaflet en local** : `npm install leaflet` puis le script
  `install-leaflet` du `package.json` (`cp -r node_modules/leaflet/dist
  lib/leaflet`). MV3 interdit le CDN.
- **Générer les icônes PNG** (16 / 32 / 48 / 128 px) depuis le SVG du logo, vers
  `assets/icons/`. Le `manifest.json` les référence déjà.
- **Renseigner les `CLIENT_ID` / `CLIENT_SECRET` définitifs.** Localisés :
  `extension/background/auth-worker.js` (extension) et `pwa/platform-pwa.js`
  (PWA). Pas de bloc `oauth2` au manifeste.

### Magasin

- Créer le compte développeur Chrome Web Store, payer les **5 $** (une seule
  fois, vaut aussi pour V1).
- Empaqueter l'extension en `.zip`.
- Créer et héberger la page **`/privacy`** sur `pinkin.org` — exigée dès toute
  publication au magasin, *même non-listée*, parce que l'app manipule des
  données personnelles. Hébergement statique gratuit.
- Réunir les éléments de fiche : description, capture(s) d'écran, catégorie,
  langue, description de la finalité unique.
- Téléverser le `.zip`, régler la visibilité sur **non-listé**, soumettre.
- Passer la **revue du magasin** (examen renforcé pour permissions sensibles).

### Résultat

L'extension s'installe par lien et bénéficie des mises à jour automatiques —
suffisant pour l'usage personnel et le cercle proche. L'OAuth reste en mode
test : seuls les utilisateurs ajoutés à la main peuvent se connecter, et les
refresh tokens expirent après 7 jours (reconnexion régulière).

---

## V1 — Release publique

### Validation OAuth « scope sensible »

Les scopes `contacts.readonly` et `contacts` (écriture) sont **sensibles**, pas
restreints : la validation ne demande **pas** d'audit de sécurité tiers (CASA),
pas de coût récurrent. Elle demande :
- la justification de chaque scope ;
- une **vidéo de démonstration** de l'usage ;
- une politique de confidentialité (`/privacy`) et des conditions (`/terms`) sur
  un **domaine vérifié** ;
- la revue de l'identité de l'app.

Processus arbitré par Google — latence et itérations possibles, hors contrôle.

### PWA

Déployer la PWA, validée en V0.2, en hébergement statique sur `pinkin.org`
(HTTPS requis). L'hébergeur reste à choisir (offre gratuite — Vercel, Cloudflare
Pages, Netlify, GitHub Pages).

### Bascule

Validation OAuth obtenue → passer la visibilité du magasin de **non-listé à
listé**. C'est un simple réglage, pas une recréation. Pinkin est public.

---

## Les deux surfaces et leurs canaux

Extension et PWA se distribuent **séparément** :
- **Extension** → Chrome Web Store. Chemin : non-listé (mise en magasin) → listé
  (V1).
- **PWA** → hébergement statique sur `pinkin.org`. Validée en V0.2, déployée en
  V1.

La revue du Chrome Web Store et la validation OAuth sont **deux portes Google
distinctes** : la première examine le paquet et la fiche, la seconde l'écran de
consentement et les scopes du projet Cloud. V1 a besoin des deux.

---

## Choix irréversibles & points durs

- **ID de l'extension** — déjà figé par le `key` du manifeste. Plus un risque.
- **Mode test** — refresh tokens à durée de vie courte (7 jours) jusqu'à la
  validation V1. C'est le prix du régime test ; il disparaît à V1.
- **Validation OAuth** — dépendance externe, arbitrée par Google. C'est le vrai
  chemin critique de V1, pas le code.
- **Revue magasin ≠ validation OAuth** — deux processus, à ne pas confondre.

---

## Coûts

| Poste | Coût |
|---|---|
| Compte développeur Chrome Web Store | 5 $, une seule fois |
| Validation OAuth (scope sensible) | 0 $ |
| Hébergement `/privacy`, `/terms`, PWA | 0 $ (offre statique gratuite) |
| Renouvellement `pinkin.org` | récurrent, déjà engagé chez Gandi |
| Nominatim, People API | 0 $ |

En argent : **5 $ une fois** + le domaine déjà payé. Le reste du coût est en
effort et en latence de revue, pas en euros.

---

## Décisions prises (session #4)

- V0/V1 en mode test jusqu'à la validation ; release publique = V1.
- V1 livre l'**écriture** (correction d'adresse, publication GEO opt-in).
- Distribution magasin : **non-listé d'abord, listé à V1**.
- Orchestrateurs : **extraction d'un module partagé** en V0.2 (et non rattrapage
  manuel des jumeaux).
- Compte développeur payé à la mise en magasin (après V0.2).

## Questions ouvertes / arbitrages

- **Secrets OAuth dans le code suivi.** Les `CLIENT_SECRET` des deux clients
  sont en clair dans `extension/background/auth-worker.js` et
  `pwa/platform-pwa.js` — et déjà dans l'historique git (commit `db6d9bd`).
  Avant tout dépôt **public** : trancher — dépôt privé, ou régénération des
  secrets côté Google Cloud. Les apps front livrent de toute façon ce secret
  au navigateur ; le risque propre au dépôt public est le scraping automatisé
  et la révocation automatique par Google.
- Hébergeur statique pour `pinkin.org` (`/privacy`, `/terms`, PWA) à choisir.
- Contenu des pages `/privacy` et `/terms` à rédiger — l'histoire de Pinkin est
  favorable (zéro serveur, tout local), la rédaction sera honnête et simple.
- Déduplication poussée au-delà de l'orchestrateur (le reste de `core/` est
  réputé sain) — à ne rouvrir que si V0.2 le révèle nécessaire.
- Timing exact du déploiement PWA — supposé en V1 ; à confirmer.
