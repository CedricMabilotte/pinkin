# TEST V0.2 — plan de test runtime

*Établi en session #5. Objectif : éprouver à l'exécution tout ce que les
handoffs #3 et #4 ont laissé en `[SUPPOSÉ]` — c'est le critère de sortie de
V0.2, et le préalable à la mise en magasin.*

Le code, lui, est vérifié : extraction de l'orchestrateur auditée contre le
code, 36 tests unitaires verts, bug de callback PWA corrigé. Ce qui suit ne se
vérifie qu'au navigateur, par toi.

**Comment s'en servir.** Dérouler chaque test dans l'ordre. Pour chacun, cocher
le résultat et, si ça casse, noter ce qui s'est passé (message console inclus —
console ouverte avec F12). Me rapporter le tout : je corrige ce que ça révèle
(tâche #8).

---

## Préalables

### Déjà vérifié (session #5) — rien à faire

- Leaflet vendu en local (`lib/leaflet/`) — MV3 interdit le CDN.
- Icônes PNG 16/32/48/128 présentes et référencées par le manifeste.
- `CLIENT_ID` / `CLIENT_SECRET` renseignés (extension et PWA).
- `key` présent au manifeste → l'ID de l'extension est stable.

### À vérifier côté Google Cloud Console — par toi, avant de tester

1. **Compte de test.** Écran de consentement OAuth → le compte Google avec
   lequel tu vas tester doit figurer dans les *Utilisateurs tests*. En mode
   test, aucun autre compte ne peut se connecter.
2. **URI de redirection — client OAuth de l'extension.** L'ID de l'extension,
   calculé depuis le `key` du manifeste, est :
   `pnobmjminhgbbgpbogljljojaojiapdp`
   Le client OAuth de l'extension (type *Application Web*) doit autoriser
   l'URI de redirection :
   `https://pnobmjminhgbbgpbogljljojaojiapdp.chromiumapp.org/`
3. **URI de redirection — client OAuth de la PWA.** Pour le test local de la
   PWA (Test F), le client OAuth PWA doit autoriser l'URI de redirection
   correspondant à l'origine de test locale, p. ex.
   `http://localhost:3000/auth/callback`. (À caler avec la mise en place du
   serveur local — voir Test F.)

---

## A — Extension : démarrage, authentification, géocodage

**Chargement.**

1. Ouvrir `chrome://extensions`, activer le *Mode développeur* (coin haut-droit).
2. *Charger l'extension non empaquetée* → choisir le dossier du projet `pinkin/`.
3. L'extension « Pinkin » apparaît, sans bandeau d'erreur rouge.

   Attendu : pas d'erreur de manifeste ; l'icône Pinkin est dans la barre.
   Résultat : [ ] OK   [ ] KO — notes :

**Première connexion.**

4. Cliquer l'icône Pinkin. L'app s'ouvre dans un **onglet** (pas un popup).
5. Écran d'accueil → bouton de connexion. Cliquer.
6. Une fenêtre Google de consentement s'ouvre → choisir le compte de test,
   accorder l'accès *lecture* aux contacts.

   Attendu : retour automatique dans l'onglet ; écran de chargement
   « Chargement des contacts… » ; pas de retour à l'écran d'accueil.
   Résultat : [ ] OK   [ ] KO — notes :

**Synchronisation et géocodage.**

7. Laisser charger. La carte s'affiche, des marqueurs apparaissent
   progressivement ; un bandeau de géocodage indique l'avancement.

   Attendu : la carte est visible *avant* la fin du géocodage ; les marqueurs
   se posent au fil de l'eau ; le bandeau finit par annoncer un décompte
   (« N contacts localisés », éventuellement « sur M »).
   Résultat : [ ] OK   [ ] KO — notes :

8. Fermer l'onglet, recliquer l'icône.

   Attendu : réouverture instantanée (cache) ; les contacts déjà localisés ne
   sont PAS re-géocodés ; un seul onglet Pinkin à la fois.
   Résultat : [ ] OK   [ ] KO — notes :

---

## B — Extension : Carnet & Fiche

9. Onglet **Carnet** : la liste affiche *tous* les contacts, y compris ceux
   sans position. Tester le tri, le filtre (sur la carte / hors carte), la
   recherche.

   Attendu : chaque ligne est cliquable ; le filtre et la recherche répondent.
   Résultat : [ ] OK   [ ] KO — notes :

10. Cliquer un contact **localisé** → sa fiche s'ouvre (carte compacte, photo
    ou initiales, coordonnées).
11. Revenir au Carnet, cliquer un contact **hors carte** → sa fiche s'ouvre
    aussi (c'est le trou UX refermé en #3 : joignable sans marqueur).

    Attendu : les deux fiches s'ouvrent correctement.
    Résultat : [ ] OK   [ ] KO — notes :

---

## C — Extension : actions de contact

Sur une fiche, les pastilles d'action dépendent des coordonnées du contact.

12. **mailto** — cliquer la pastille e-mail d'un contact qui a une adresse mail.

    Attendu : le gestionnaire de messagerie s'ouvre sur un brouillon
    pré-adressé. *(Point `[SUPPOSÉ]` depuis #3 — jamais confirmé.)*
    Résultat : [ ] OK   [ ] KO — notes :

13. **tel** — cliquer la pastille téléphone d'un contact qui a un numéro.

    Attendu : le navigateur propose d'ouvrir l'app d'appel / propose une action
    `tel:`.
    Résultat : [ ] OK   [ ] KO — notes :

14. **SMS / WhatsApp / Signal** — sur un contact avec numéro, tester les
    pastilles correspondantes (canaux de demande de mise à jour).

    Attendu : chaque lien ouvre le bon canal. *(Comportement `[SUPPOSÉ]`.)*
    Résultat : [ ] OK   [ ] KO — notes :

---

## D — Extension : import .vcf

**À faire APRÈS le test E.** Le bouton d'import vit dans la fiche d'un contact,
section *Adresse* — et cette section n'apparaît QUE si le scope écriture est
accordé (l'import pré-remplit un formulaire de correction qui, lui, écrit dans
Google). Tant que l'écriture n'est pas autorisée, à la place du bouton tu vois
le message « Pour corriger une adresse, autorise d'abord Pinkin… ».

**Sur le format.** Un fichier vCard *est* un fichier `.vcf` — c'est la même
chose, `.vcf` est l'extension des fichiers vCard. L'export « vCard » de Google
Contacts produit donc bien un `.vcf`. Un export **CSV**, lui, n'est PAS du
vCard : Pinkin ne le lit pas (et ne doit pas — l'import `.vcf` sert au cas « un
contact partage sa fiche depuis son téléphone », qui produit du vCard). Un CSV
donnera « Aucune adresse trouvée » — c'est le comportement correct, pas un bug.

Fichier d'exemple fourni, prêt à l'emploi : `test/fixtures/exemple-contact.vcf`
(adresse à Lyon).

15. Ouvrir la fiche d'un contact → section *Adresse* → bouton « Importer .vcf »
    → sélectionner `test/fixtures/exemple-contact.vcf`.

    Attendu : le formulaire de correction s'ouvre, pré-rempli avec l'adresse
    extraite (24 rue de la République, Lyon, Rhône, 69002, France), et le
    message « Adresse importée — vérifie, puis enregistre. » *(Chaîne complète
    sélection → parse → pré-remplissage, jamais exercée — `[SUPPOSÉ]` #3.)*
    Résultat : [ ] OK   [ ] KO — notes :

---

## E — Extension : écriture (contrôle d'en-tête, refonte session #5)

Le cœur de la décision D1. À ne faire qu'avec un compte de test dont tu acceptes
que les contacts soient modifiés (réversible — étape 19). L'écriture se pilote
désormais par le bouton « Écriture » de l'en-tête (refonte P1) — il n'y a plus
de bandeau en bas.

16. Le bouton « Écriture » de l'en-tête porte une petite pastille d'invite. Le
    cliquer → un popover s'ouvre dessous, avec « Autoriser l'écriture ». Cliquer
    ce bouton, puis accorder le scope *écriture* dans la fenêtre Google.

    Attendu : le bouton « Écriture » passe en « en cours » (spinner) puis en
    état actif (teinté) ; le popover affiche un décompte « N contacts inscrits ».
    Résultat : [ ] OK   [ ] KO — notes :

17. Lancer une synchro (icône de synchro).

    Attendu : le bouton « Écriture » reste en état actif et **aucun popover ne
    surgit** — c'est le défaut central corrigé cette session.
    Résultat : [ ] OK   [ ] KO — notes :

18. Ouvrir Google Contacts dans un autre onglet, vérifier que des contacts
    portent bien un champ GEO.

    Attendu : les positions sont inscrites côté Google.
    Résultat : [ ] OK   [ ] KO — notes :

19. Cliquer « Écriture » → popover → « Retirer » → « Confirmer le retrait ».

    Attendu : le popover affiche le décompte de retrait ; dans Google Contacts,
    les champs GEO inscrits par Pinkin ont disparu ; les marqueurs restent sur
    la carte Pinkin (cache local).
    Résultat : [ ] OK   [ ] KO — notes :

---

## G — Extension : autres points de la refonte d'interactions (session #5)

20. **Déconnexion.** Cliquer « Déconnexion » → un popover de confirmation
    s'ouvre dans l'app (et non une boîte de dialogue native du navigateur).
    « Annuler » le referme sans rien effacer.
    Résultat : [ ] OK   [ ] KO — notes :

21. **Opt-in depuis la fiche.** Avec l'écriture *non* accordée, ouvrir la fiche
    d'un contact → section Adresse : un bouton « Autoriser l'écriture » y figure
    directement. (Si l'écriture est déjà accordée, test sans objet.)
    Résultat : [ ] OK   [ ] KO — notes :

22. **Focus clavier.** Fiche contact ouverte : la touche Tab fait tourner le
    focus *dans* la fiche, sans en sortir vers l'arrière-plan.
    Résultat : [ ] OK   [ ] KO — notes :

---

## F — PWA : parcours complet + retour OAuth

**La PWA n'a jamais tourné depuis le début du projet.** C'est le test le plus
incertain. Le bug de retour de consentement OAuth a été corrigé cette session
(`window.__pinkinAuthCallback`) — ce test l'éprouve pour la première fois.

**Déjà vérifié par Claude (session #5)** — le serveur de dev (`pwa/dev-server.js`)
route correctement (`/` et `/auth/callback` rendent `index.html` ; types MIME
corrects), et le graphe d'assets de la PWA est complet : les 23 modules JS et
tous les chemins absolus d'`index.html` résolvent, 0 fichier manquant (la 404
du manifeste, repérée puis corrigée — manifeste déplacé à la racine). Le test F
ne porte donc plus que sur ce qui exige un navigateur : l'exécution réelle.

**Serveur local.** Lancer `npm run dev:pwa` depuis la racine du projet, puis
ouvrir `http://localhost:3000`.

1. Ouvrir `http://localhost:3000`.

   Attendu : la coquille de l'app s'affiche, sans erreur JavaScript dans la
   console (F12) — c'est le premier vrai test d'exécution de l'orchestrateur
   refondu. Toute erreur console est à me signaler.
   Résultat : [ ] OK   [ ] KO — notes :

**Pré-requis OAuth.** Le client OAuth « PWA » (Google Cloud) doit autoriser
l'URI de redirection exacte : `http://localhost:3000/auth/callback`.

Une fois la coquille chargée, le parcours est le **même que A→E**, avec un point
d'attention sur le retour de consentement :

20. À la connexion, la PWA **redirige la page entière** vers Google (pas de
    fenêtre surgissante). Après le consentement, Google renvoie sur
    `/auth/callback?code=…`.

    Attendu : la PWA finit la connexion et charge les contacts — *sans*
    repasser par l'écran d'accueil. (C'est exactement le bug corrigé en
    session #5 : si tu reviens sur l'écran de connexion, le correctif n'a pas
    pris — me le signaler.)
    Résultat : [ ] OK   [ ] KO — notes :

---

## Comment rapporter

Pour chaque test KO : le numéro, ce que tu as vu, et le contenu de la console
(F12 → onglet *Console*) — côté extension, penser aussi à la console du *service
worker* (chrome://extensions → Pinkin → « service worker »).

Critère de sortie V0.2 : A→E verts sur l'extension, F vert sur la PWA, et tout
KO corrigé. On passe alors à la mise en magasin.
