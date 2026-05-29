# Pinkin

**Épingle tes proches sur une carte.**  
Extension Chrome (desktop) + PWA (mobile/universel).  
Pont d'acquisition vers le framework communautaire générique (Freechi).

---

## Stack

- JavaScript vanilla (pas de framework)
- Manifest V3 (Chrome Extension)
- Leaflet.js + tuiles OpenStreetMap
- Google People API (OAuth 2.0 + PKCE)
- Nominatim (géocodage)
- Zéro backend en v1

---

## Structure

```
pinkin/
├── core/                  ← Moteur partagé (framework-agnostique)
│   ├── api/               ← Appels Google People API + Nominatim
│   ├── model/             ← Contact, GeoPoint
│   ├── services/          ← contacts-sync, geocoder, vcard-writer
│   ├── crypto.js          ← Chiffrement AES-GCM WebCrypto
│   └── platform.js        ← Abstraction stockage + auth (Extension/PWA)
├── extension/             ← Habillage Chrome Extension MV3
│   ├── background/
│   ├── popup/
│   └── platform-extension.js
├── pwa/                   ← Habillage PWA
│   ├── app.js
│   ├── main.js
│   ├── platform-pwa.js    ← OAuth PKCE
│   ├── index.html
│   ├── manifest.webmanifest
│   └── service-worker-pwa.js
├── ui/                    ← Composants UI partagés
│   ├── orchestrator.js    ← Séquence de démarrage partagée (Extension + PWA)
│   ├── shell.js           ← Coquille DOM partagée
│   ├── carnet.js          ← Vue Carnet
│   ├── map.js             ← Leaflet init + marqueurs
│   └── contact-panel.js   ← Fiche contact + actions
├── assets/icons/          ← Icônes PNG (à générer depuis pinkin_logo.svg)
├── lib/leaflet/           ← Leaflet bundlé localement (requis MV3)
└── manifest.json          ← Manifest Chrome Extension
```

---

## Configuration requise

### 1. Identifiants OAuth

Pinkin embarque deux clients OAuth Google, un par surface. Pour un fork,
remplacer les valeurs par les siennes :

- Extension — `extension/background/auth-worker.js` : `CLIENT_ID` et `CLIENT_SECRET`
- PWA — `pwa/platform-pwa.js` : `CLIENT_ID` et `CLIENT_SECRET`

Il n'y a pas de bloc `oauth2` dans `manifest.json` : le flux passe par
`launchWebAuthFlow` (extension) et PKCE (PWA).

Note : ces clients sont des applications front ; leur code — donc leur
`CLIENT_SECRET` — est livré au navigateur. Ne pas pousser le dépôt en public
sans avoir tranché le traitement de ces identifiants (cf. `PLAN_PHASE_E.md`).

### 2. Installer Leaflet localement (requis MV3)

```bash
npm install leaflet
cp -r node_modules/leaflet/dist lib/leaflet
```

### 3. Générer les icônes PNG

Depuis `pinkin_logo.svg`, exporter :
- `assets/icons/icon16.png`
- `assets/icons/icon32.png`
- `assets/icons/icon48.png`
- `assets/icons/icon128.png`

---

## Charger l'extension en mode développeur

1. Chrome → `chrome://extensions`
2. Activer "Mode développeur"
3. "Charger l'extension non empaquetée"
4. Sélectionner le dossier racine `pinkin/`

---

## Phases

- PHASE 0  — Vision ✓
- PHASE A  — Architecture ✓
- PHASE B  — OAuth, contacts, géocodage ✓
- PHASE C  — Interface carte, marqueurs, panel ✓
- PHASE D  — Écriture GEO opt-in, ponts framework
- PHASE E  — Distribution Chrome Web Store + déploiement PWA

---

## Forks

Ce projet est conçu pour être forké.  
- `core/` est générique — aucune logique Freechi/Pinkin-specific
- Les spécificités Pinkin sont dans `extension/`, `pwa/`, `ui/`
- Remplacer `platform.js` pour une nouvelle surface de distribution
