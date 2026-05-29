# Pinkin

**Où sont tes proches sur la carte ?**

Extension Chrome + PWA qui épingle tes contacts Google sur OpenStreetMap.
Zéro serveur, zéro tracker, code consultable.

[![Tests](https://github.com/CedricMabilotte/pinkin/actions/workflows/tests.yml/badge.svg)](https://github.com/CedricMabilotte/pinkin/actions/workflows/tests.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/source-public-brightgreen.svg)](https://github.com/CedricMabilotte/pinkin)

→ **pinkin.org** · [Privacy](https://pinkin.org/privacy) · [Terms](https://pinkin.org/terms) · [Security](SECURITY.md)

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
remplacer les valeurs par les siennes.

**Extension Chrome.** Les identifiants vivent dans
`extension/background/secrets.js` (gitignored). Le fichier est créé à
partir de `extension/background/secrets.example.js` :

```bash
cp extension/background/secrets.example.js extension/background/secrets.js
# puis remplace CLIENT_ID et CLIENT_SECRET par tes vraies valeurs
```

Le fichier `secrets.js` est inclus automatiquement dans le zip CWS par
`scripts/pack-extension.sh` (qui refuse de packer si le fichier contient
encore les valeurs placeholder).

**PWA.** Les identifiants vivent comme env vars Cloudflare du Worker
`pinkin-org` :

- `PINKIN_PWA_CLIENT_ID` — variable publique (déclarée dans `wrangler.toml`).
- `PINKIN_PWA_CLIENT_SECRET` — variable encrypted, posée via dashboard
  Cloudflare ou `wrangler secret put PINKIN_PWA_CLIENT_SECRET`.

`worker.js` lit ces vars et les expose via `/api/oauth-config`, que
`pwa/platform-pwa.js` consomme au boot pour faire l'échange OAuth.

Pour le développement local (`npm run dev:pwa`), `pwa/dev-server.js`
doit servir un `/api/oauth-config` équivalent — TODO sur le TAF.

Il n'y a pas de bloc `oauth2` dans `manifest.json` : le flux passe par
`launchWebAuthFlow` (extension) et PKCE (PWA).

**Note honnête sécurité.** Ces clients sont des applications front ;
leur `CLIENT_SECRET` reste de fait public — quiconque inspecte le zip
CWS distribué ou ouvre les DevTools sur pinkin.org peut le lire. C'est
une exigence technique de Google pour un client OAuth « Web » (PKCE ne
remplace pas le secret). La vraie protection est le verrouillage du
redirect URI côté Google (cf. `JUSTIFICATION_OAUTH.md`). Le mécanisme
ci-dessus garde juste le secret hors de l'historique git, pas hors de
la portée d'un utilisateur curieux.

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

- `core/` est générique — aucune logique Pinkin-specific
- Les spécificités Pinkin sont dans `extension/`, `pwa/`, `ui/`
- Remplacer `platform.js` pour une nouvelle surface de distribution

**Licence : AGPL-3.0.** Si tu sers Pinkin (ou un fork) comme web service,
tu dois publier ton code source modifié. Voir [`LICENSE`](LICENSE).

---

## Reproducible builds

Le `.zip` Chrome Web Store distribué doit être reproductible bit-à-bit
depuis ce repo public — sinon le « code consultable » est creux.

```bash
git checkout v1.0.0
npm ci
npm run install-leaflet
cp extension/background/secrets.example.js extension/background/secrets.js
# (renseigner les valeurs OAuth — elles ne changent pas le hash si elles
# matchent celles utilisées au build officiel)
bash scripts/pack-extension.sh
sha256sum dist/pinkin-v1.0.0.zip
```

`SOURCE_DATE_EPOCH` est dérivé du commit Git ; deux builds successifs du
même commit produisent un zip identique.

---

## Sécurité

Voir [`SECURITY.md`](SECURITY.md) — disclosure policy + reconnaissance.

---

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md). Pinkin est intentionnellement
single-purpose. Les PRs qui élargissent le scope seront probablement
déclinées ; celles qui durcissent la posture (sécurité, privacy,
qualité) sont les bienvenues.
