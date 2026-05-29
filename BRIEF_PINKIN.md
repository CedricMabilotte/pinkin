# Brief Pinkin — Contexte projet pour Cowork

## Mode de travail

Mode conceptuel, critique et stratégique.
Aucune indication temporelle dans les réponses.
Phases massives avec qualification profonde avant démarrage.
Verbose dans les tâches d'exécution : commenter chaque bloc avec son intention.
Nommer explicitement les choix faits et pourquoi.
Signaler ce qui est spécifique au fork Freechi vs ce qui est générique.

Chaque réponse intègre :
- Une couche pédagogique sur les concepts techniques abordés
- Une couche stratégique sur les choix du marché
- Une couche méta sur l'usage avancé de Claude quand pertinent

Profil opérateur : non-codeur, forte capacité d'ingénierie générale.
Vulgariser sans simplifier.

---

## Contexte parent — Framework communautaire générique (Freechi)

Stack : Next.js 15, Supabase natif, Once UI, Leaflet, Vercel.
Pas de Basejump — auth et permissions via primitives Supabase.
Tables génériques : profiles, spaces, memberships, communities, interactions.
Contraintes : tout gratuit, tout open source, zéro intervention manuelle admin,
RLS Supabase natif, TypeScript strict, mobile-first.
Architecture forkable : séparation stricte config/core.

---

## Ce qu'est Pinkin

Extension Chrome (desktop) + PWA (mobile/universel).
Géolocalise les contacts Google sur une carte OpenStreetMap.
Usage strictement personnel.
Pont d'acquisition vers le framework communautaire générique (Freechi).

**Proposition de valeur**
"Pin" = épingle sur la carte.
"Kin" = tes proches, ceux qui comptent.
.org = signal open source, non-commercial.

Site : pinkin.org (actif chez Gandi)

---

## Stack

- JavaScript vanilla (pas de framework)
- Manifest V3 (Chrome Extension)
- Leaflet.js + tuiles OpenStreetMap
- Google People API (OAuth 2.0 + PKCE)
- Nominatim (géocodage, gratuit, privacy-first)
- Zéro backend en v1

---

## Décisions qualifiées — irréversibles

### Distribution
- Extension Chrome Manifest V3 (desktop, Chrome/Brave/Edge)
- PWA (mobile, tous navigateurs)
- Code partagé entre les deux surfaces via core/

### Auth
- Option B retenue : refresh token chiffré AES-GCM via WebCrypto API
- Clé maître générée à l'installation, stockée localement, ne quitte jamais le navigateur
- Extension : chrome.identity
- PWA : Authorization Code Flow + PKCE (zéro backend)

### Données
- Modèle B — lecture + écriture opt-in
- OAuth Google scope contacts.readonly par défaut
- Upgrade vers scope contacts sur acceptation explicite (Phase D)
- Géoloc stockée dans champ GEO vCard de Google Contacts (RFC 6350)
- Fallback localStorage si opt-in refusé
- Google Contacts = source de vérité. Local = cache avec TTL 10 minutes.

### Géocodage
- Nominatim + OpenStreetMap (gratuit, privacy-first)
- Incrémental : 1 contact/seconde en arrière-plan (rate-limit Nominatim)
- Seuls les contacts sans champ GEO sont traités
- Cache géo persistant — contacts déjà géocodés jamais retraités
- Première ouverture : lent — ouvertures suivantes : instantané

### Actions sur contact (v1)
- Lecture seule : fiche vCard, photo, coordonnées
- Communication : mailto, tel, deep links (WhatsApp, Signal)
- Écriture : mise à jour adresse/géoloc à l'initiative utilisateur (Phase D)
- Pas d'intégrations tierces en v1

### Ponts vers le framework
- Porte 1 — "Invite un contact à mettre à jour sa fiche"
  email avec lien formulaire, sans compte requis, style Plaxo
  Reportée — dépend d'un endpoint Freechi.
- Porte 2 — ré-conçue. N'est plus un email d'invitation : c'est l'ouverture
  de Pinkin aux carnets d'adresses communautaires (Pinkin comme client
  multi-carnets). Explorée en session #4, voir CONCEPT_MULTICARNETS.md.
  Différée après la V1.

---

## Invariants

- La géoloc appartient au contact, pas au plugin
- Standard vCard respecté (champ GEO natif RFC 6350)
- Zéro serveur en v1 — tout tourne dans le navigateur
- Le plugin a de la valeur indépendamment du framework
- Vie privée by design — pas de tracking, pas d'analytics tiers

---

## Structure du projet (fichiers présents dans le dossier)

```
pinkin/
├── core/
│   ├── api/
│   │   └── google-people.js     ← People API, pagination, updateContactGeo placeholder
│   ├── model/
│   │   ├── contact.js           ← Parse raw Google, champ GEO RFC 6350, needsGeocoding()
│   │   └── geopoint.js          ← Coordonnées, toVCardGeo(), fromNominatim()
│   ├── services/
│   │   ├── contacts-sync.js     ← Sync Google → cache local, clearCache()
│   │   ├── geocoder.js          ← Géocodage incrémental Nominatim, AbortSignal
│   │   └── vcard-writer.js      ← Placeholder Phase D
│   ├── crypto.js                ← AES-GCM WebCrypto, getMasterKey, encrypt, decrypt
│   └── platform.js              ← Abstraction stockage Extension/PWA, injection auth
├── extension/
│   ├── background/
│   │   └── service-worker.js    ← MV3 SW minimal
│   ├── popup/
│   │   ├── popup.html           ← Shell UI, tous les états
│   │   ├── popup.css            ← Design system complet
│   │   └── popup.js             ← Point d'entrée : injecte l'auth, délègue à ui/orchestrator.js
│   └── platform-extension.js   ← chrome.identity, token chiffré
├── pwa/
│   ├── app.js                   ← Point d'entrée PWA : injecte l'auth, délègue à ui/orchestrator.js
│   ├── index.html               ← Shell PWA plein écran
│   ├── main.js                  ← Injection Platform.auth = PWAAuth + callback OAuth
│   ├── manifest.webmanifest
│   ├── platform-pwa.js          ← PKCE OAuth, refresh token chiffré
│   └── service-worker-pwa.js    ← Cache offline assets
├── ui/
│   ├── orchestrator.js          ← Séquence de démarrage partagée Extension/PWA
│   ├── shell.js                 ← Coquille DOM partagée (source unique du balisage)
│   ├── carnet.js                ← Vue Carnet — liste, tri, filtre, recherche
│   ├── map.js                   ← Leaflet init, marqueurs photo/initiales, upsertMarker
│   └── contact-panel.js         ← Fiche contact, actions dynamiques (email/tel/SMS/WA/Signal)
├── assets/icons/                ← PNG à générer depuis pinkin_logo.svg (16/32/48/128px)
├── lib/leaflet/                 ← Leaflet bundlé local (MV3 interdit CDN)
├── manifest.json                ← Chrome Extension MV3
├── package.json
└── README.md
```

---

## État des phases

- PHASE 0  — Vision, positionnement ✓ qualifiée
- PHASE A  — Architecture extension + PWA ✓ livrée
- PHASE B  — OAuth Google, lecture contacts, géocodage ✓ livrée
- PHASE C  — Interface carte, marqueurs, action panel ✓ livrée
- PHASE D1 — Écriture GEO opt-in + refonte auth (launchWebAuthFlow/PKCE) ✓ livrée, revue, durcie
- PHASE D2 — Ponts framework — Porte 1 reportée (dépend de Freechi) ;
             Porte 2 ré-conçue (ouverture multi-carnets) et différée après V1,
             voir CONCEPT_MULTICARNETS.md
- PHASE E  — Distribution V1 publique ← prochaine
             Périmètre à qualifier. Pistes retenues en session #4 : extension
             Chrome seule (PWA actée hors V1, jamais éprouvée), lecture seule à
             étudier pour alléger la validation OAuth Google.

Voir HANDOFF_D1.md pour l'état de reprise détaillé (vérifié vs non vérifié, checklist Phase E).

---

## Ce qui reste à faire avant de tester (actions manuelles)

1. Remplacer les CLIENT_ID
   - manifest.json → oauth2.client_id → EXT_CLIENT_ID
   - pwa/platform-pwa.js → ligne CLIENT_ID → PWA_CLIENT_ID

2. Installer Leaflet localement
   npm install leaflet
   cp -r node_modules/leaflet/dist lib/leaflet

3. Générer les icônes PNG depuis pinkin_logo.svg
   Tailles requises : 16, 32, 48, 128px → assets/icons/

4. Charger l'extension dans Chrome
   chrome://extensions → Mode développeur → Charger l'extension non empaquetée → dossier pinkin/

---

## Google Cloud Console

- Projet créé : pinkin
- People API activée
- Écran de consentement : mode test, scope contacts.readonly
- Client ID Extension : créé (ID temporaire — à compléter en Phase E avec l'ID Chrome Web Store)
- Client ID PWA : créé
- pinkin.org actif chez Gandi
- Pages /privacy et /terms : à créer avant Phase E

---

## Identité visuelle

Palette :
- Rose primaire    #C2185B  (activisme)
- Rose fuchsia     #E91E8C  (hot pink)
- Rose blush       #FCE4EC
- Fond             #FDF6F0
- Texte            #1A1A2E

Logo : badge militant circulaire, koala rose, direction 3 retenue.
Fichier SVG disponible : pinkin_logo.svg
Icônes PNG à générer depuis ce SVG.

---

## Principe des phases massives

Chaque phase ne démarre qu'après qualification profonde de la précédente.
Qualification = analyse des risques, dépendances, choix irréversibles,
alternatives non retenues et pourquoi.

Avant tout travail sur Phase D, poser les questions de qualification.
Ne jamais présupposer qu'une phase est prête à démarrer.
