# Fiche Chrome Web Store — Pinkin

*Texte prêt à coller dans la fiche développeur de l'extension. Issu de
session #8. À téléverser après création du compte développeur ($5, une
fois) et empaquetage `.zip` via `scripts/pack-extension.sh`.*

---

## Identité

| Champ | Valeur |
|---|---|
| **Nom** | `Pinkin` — lu dans `manifest.json` (champ `name`), non modifiable dans le dashboard. L'accroche passe par la description courte. |
| **Identifiant Chrome Web Store** | (assigné par Google à la première publication) |
| **Identifiant interne extension** | déjà figé par le `key` du `manifest.json` — survit chargement non empaqueté → magasin |
| **Catégorie principale** | *Productivité* (Productivity) |
| **Catégorie secondaire** | *Réseaux sociaux et communication* (Social & Communication) |
| **Langue principale** | Français (fr) |
| **Langues additionnelles** | L'app bascule fr/en/es selon `navigator.language`, **mais** le paquet n'a pas de dossier `_locales/` : le dashboard CWS ne proposera donc qu'**une seule langue de fiche** (fr). Les versions en/es ci-dessous ne sont collables qu'après ajout de `_locales/` (post-V1, non bloquant) — on peut en attendant ajouter un court paragraphe EN à la fin de la description FR. |
| **Site web officiel** | https://pinkin.org |
| **Page d'assistance** | https://pinkin.org (footer — l'auteur est joignable par email) |
| **Confidentialité** | https://pinkin.org/privacy (URL canonique — `/privacy.html` redirige en 307 vers elle) |
| **Conditions** | https://pinkin.org/terms |
| **Email de contact dev** | cedric.mabilotte@gmail.com |

---

## Description courte (132 caractères max)

**Rafraîchi 2026-10-06 :** sur le CWS, le résumé est lu dans le champ
`description` de `manifest.json` — il n'y a pas de champ à coller. Texte
effectivement affiché (101 caractères) :

> Où sont tes proches sur la carte ? Tes contacts Google sur OpenStreetMap, sans serveur, sans tracker.

*(L'ancienne proposition « … Zéro serveur, zéro tracker, open source. »
n'est pas dans le manifeste ; la changer imposerait un repack.)*

---

## Description longue

### Texte prêt à coller

```
Où sont tes proches sur la carte ? Pinkin met tes contacts Google sur
une carte OpenStreetMap. Tu vois d'un coup d'œil qui habite où, tu
cliques sur un pin, tu écris, tu appelles, tu ouvres WhatsApp ou Signal
en deux clics.

— Zéro serveur. L'application tourne entièrement dans ton navigateur.
  Tes contacts ne quittent jamais ton appareil. Aucune donnée n'est
  transmise à Pinkin ni à un tiers, en dehors des allers-retours
  nécessaires vers Google (lecture de tes contacts) et OpenStreetMap
  (carte et géocodage).

— Zéro tracker, zéro pub. Aucun analytics, aucun cookie tiers, aucune
  télémétrie. Le code est open source et auditable.

— Permission minimale. Pinkin demande l'accès à tes contacts Google
  (lecture). Si tu actives explicitement l'option « écriture », il peut
  enregistrer la position géographique dans le champ standard GEO de
  chaque contact (RFC 6350) — c'est tout. Aucune autre permission n'est
  utilisée.

— Carnet alphabétique en plus de la carte. Pour les contacts sans
  adresse ou non géolocalisés, un onglet « Carnet » te les laisse
  joindre sans qu'ils soient perdus de vue.

— Fonctionne aussi en PWA mobile sur pinkin.org — même code, même
  surface, ton choix.

L'application est gratuite, sans modèle commercial, sans publicité. Un
projet personnel, libre, qui fait une chose et la fait bien.

Confidentialité : https://pinkin.org/privacy.html
Conditions : https://pinkin.org/terms.html
Code source : https://github.com/CedricMabilotte/pinkin
```

### Versions traduites (à copier dans les onglets en / es de la fiche CWS)

#### English

```
Where are your loved ones on the map? Pinkin puts your Google Contacts
on an OpenStreetMap. See at a glance who lives where, click a pin to
email, call, or open WhatsApp / Signal in two clicks.

— Zero servers. The app runs entirely in your browser. Your contacts
  never leave your device. No data is sent to Pinkin or any third party,
  except the necessary round-trips to Google (reading your contacts) and
  OpenStreetMap (map tiles and geocoding).

— Zero trackers, zero ads. No analytics, no third-party cookies, no
  telemetry. The code is open source and auditable.

— Minimal permission. Pinkin asks for read access to your Google
  Contacts. If you explicitly enable the "write" option, it can save
  the geographic location into each contact's standard GEO field
  (RFC 6350) — that's it. No other permission is used.

— Address book alongside the map. Contacts without an address or not
  yet located stay reachable through the "List" tab so they aren't lost.

— Also runs as a PWA on pinkin.org for mobile — same code, same
  surface, your call.

Free, no business model, no ads. A personal, libre project that does
one thing and does it well.

Privacy: https://pinkin.org/privacy.html
Terms: https://pinkin.org/terms.html
Source: https://github.com/CedricMabilotte/pinkin
```

#### Español

```
¿Dónde están tus seres queridos en el mapa? Pinkin fija a tus contactos
de Google en un mapa OpenStreetMap. Ves de un vistazo quién vive dónde,
haces clic en un pin, escribes, llamas, abres WhatsApp o Signal con dos
clics.

— Cero servidores. La aplicación funciona enteramente en tu navegador.
  Tus contactos nunca salen de tu dispositivo. Ningún dato se envía a
  Pinkin ni a terceros, aparte de los viajes necesarios a Google
  (lectura de tus contactos) y OpenStreetMap (mapa y geocodificación).

— Cero trackers, cero publicidad. Sin analytics, sin cookies de
  terceros, sin telemetría. El código es abierto y auditable.

— Permiso mínimo. Pinkin pide acceso de lectura a tus contactos de
  Google. Si activas explícitamente la opción de « escritura », puede
  guardar la posición geográfica en el campo GEO estándar de cada
  contacto (RFC 6350) — eso es todo. No se usa ningún otro permiso.

— Agenda alfabética junto al mapa. Los contactos sin dirección o no
  localizados siguen accesibles en la pestaña « Lista » para no
  perderlos de vista.

— También funciona como PWA en pinkin.org en móvil — mismo código,
  misma superficie, tu elección.

Gratuita, sin modelo comercial, sin publicidad. Un proyecto personal y
libre que hace una cosa y la hace bien.

Privacidad: https://pinkin.org/privacy.html
Condiciones: https://pinkin.org/terms.html
Fuente: https://github.com/CedricMabilotte/pinkin
```

---

## Single purpose description (champ dédié CWS)

```
Display the user's Google Contacts as pins on an OpenStreetMap, with a
contact card to reach each person by email, phone, SMS, WhatsApp or
Signal. Optionally, write back the geographic coordinates into the
contact's standard GEO field so the next opening is instant.
```

*Une seule finalité, exposée frontalement — c'est ce que Google attend
pour passer la revue scope sensible.*

---

## Justification des permissions du manifeste

À coller dans le champ « Permission justifications » du formulaire CWS,
*une justification par permission demandée*.

### `identity` (OAuth Google)

> Required to authenticate the user with their Google account via
> `chrome.identity` and obtain a token to call Google People API. Without
> this permission, Pinkin cannot read the user's contacts.

### `storage`

> Used to cache the user's contacts locally (TTL 10 minutes) and to
> store the encrypted OAuth refresh token. No data is sent off-device.

### `host_permissions` — `https://people.googleapis.com/*`

> Required to call Google People API: read the user's contacts and,
> when the user opts in to writing, update the GEO field of each
> contact (RFC 6350).

### `host_permissions` — `https://oauth2.googleapis.com/*`
*(Ajout 2026-10-06 — permission présente dans le manifeste mais sans
justification jusqu'ici.)*
> Required to exchange the OAuth authorization code for tokens and to
> refresh the access token (Authorization Code flow with PKCE) against
> Google's token endpoint. No user data other than the OAuth codes and
> tokens is sent there.
### `host_permissions` — `https://nominatim.openstreetmap.org/*`

> Required to geocode the user's contacts' postal addresses into
> latitude/longitude coordinates via Nominatim. Rate-limited to one
> request per second to respect Nominatim's usage policy. No personal
> data beyond the address is transmitted.

### `host_permissions` — `https://*.tile.openstreetmap.org/*`

> Required to fetch the OpenStreetMap raster tiles that compose the
> map background.

---

## Onglet « Pratiques de confidentialité » du dashboard (ajout 2026-10-06)

Le formulaire CWS ne s'arrête pas aux justifications : l'onglet *Privacy
practices* doit être complet, sinon la soumission est bloquée.

**Remote code** — *No, I am not using remote code.* (Leaflet est bundlé
dans `lib/leaflet/`, CSP `script-src 'self'`.)

**Data usage — cocher honnêtement** (la donnée transite par l'extension,
même si elle reste locale) :

- [x] *Personally identifiable information* — noms, emails, téléphones,
  adresses postales des contacts Google ;
- [x] *Authentication information* — jetons OAuth (refresh token chiffré
  AES-GCM, stocké localement) ;
- [ ] le reste (santé, finances, communications personnelles, localisation
  de l'utilisateur, historique web, activité, contenu de site) : non.

**Les trois certifications** à cocher :

- je ne vends ni ne transfère les données à des tiers hors cas d'usage
  approuvés ;
- je n'utilise ni ne transfère les données à des fins sans rapport avec la
  finalité unique de l'extension ;
- je n'utilise ni ne transfère les données pour déterminer la solvabilité
  ou à des fins de prêt.

**URL de la politique de confidentialité** : https://pinkin.org/privacy

---

## Justification des scopes OAuth

*Reprise dans `JUSTIFICATION_OAUTH.md`, à coller dans le formulaire de
validation Google OAuth (côté Cloud Console), distinct du formulaire
CWS.*

---

## Plan des captures d'écran

| # | Nom de fichier suggéré | Sujet | Cadrage |
|---|---|---|---|
| 1 | `01-carte.png` | Vue carte principale, pins distribués sur l'Europe | 1280×800, zoom sur une région à forte densité |
| 2 | `02-fiche.png` | Fiche contact ouverte, avec actions (email/tel/WA/Signal) | Pin sélectionné, panneau à droite |
| 3 | `03-carnet.png` | Onglet « Carnet », contacts hors carte + recherche active | Recherche en cours, 2-3 résultats |
| 4 | `04-ecriture.png` | Popover « Écriture » + opt-in scope, avant publication | Bouton « Autoriser l'écriture » visible |
| 5 | `05-multi-langue.png` | Header en anglais (montre i18n fr/en/es) | Le même écran que #1, mais en EN |

*Format CWS requis : 1280×800 ou 640×400. Au moins 1 capture obligatoire,
maximum 5. Pinkin en livre 5 pour démonstrer l'amplitude réelle des
fonctionnalités.*

*L'opérateur capte ces écrans depuis sa propre instance après la mise en
prod ; alternative : depuis la PWA en local à `http://localhost:3000`
avec un compte de test, après `npm run dev:pwa`.*

---

## Image promotionnelle

| Format CWS | Statut |
|---|---|
| Small tile 440×280 | À produire — peut réutiliser un crop de `02-fiche.png` ou un mockup texte avec logo |
| Marquee 1400×560 | Optionnel — non nécessaire pour V1, peut s'ajouter plus tard |

---

## Visibilité initiale

- **À la mise en magasin (avant validation OAuth)** : *Non-listé* (unlisted).
  L'extension n'apparaît pas dans la recherche CWS. Seuls les utilisateurs
  ajoutés à l'écran de consentement OAuth (mode test) peuvent se connecter.

- **À la bascule V1 (après validation OAuth)** : *Listé*. L'extension
  apparaît dans la recherche CWS et l'écran de consentement OAuth bascule
  en production.

---

## Checklist avant soumission — état au 2026-10-06
- [x] Compte développeur Chrome Web Store payé (S9-bis)
- [x] `.zip` produit : `dist/pinkin-v1.0.0.zip` — **re-vérifié 2026-10-06** :
      contenu identique octet par octet aux sources actuelles (aucun commit
      depuis le 2026-06-19 ne touche `manifest.json`, `extension/`, `core/`,
      `ui/`, `i18n/`, `assets/icons/`, `lib/leaflet/`). Pas de repack nécessaire.
- [x] Manifeste : version `1.0.0`, `key` présent, icônes 16/32/48/128
- [x] `extension/background/secrets.js` réel (non placeholder) inclus dans le zip
- [x] `https://pinkin.org/privacy` et `/terms` en ligne, HTTPS, identiques au dépôt (vérifié 2026-10-06)
- [ ] Captures d'écran 1280×800 (5)
- [ ] Small tile 440×280
- [ ] Description longue + single purpose collées
- [ ] Justifications de permissions collées (5 hôtes + `identity` + `storage`)
- [ ] Onglet *Privacy practices* rempli (voir section dédiée)
- [ ] Visibilité **Non-listé**
- [ ] Soumis pour revue
