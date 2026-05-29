# Justification scopes OAuth Google — Pinkin

*Texte prêt à coller dans le formulaire « OAuth verification » de Google
Cloud Console pour le projet `pinkin`, section « Scopes ». Session #8.*

---

## Contexte projet (rappel)

| Champ | Valeur |
|---|---|
| **Nom OAuth** | Pinkin |
| **Type d'app** | Web app (PWA) + Chrome Extension MV3 — *Two clients, same brand* |
| **Catégorie de scopes demandée** | **Sensitive scopes** (`contacts.readonly` + `contacts`). Pas de *restricted scope* — pas d'audit CASA, pas de coût récurrent. |
| **Site web officiel** | https://pinkin.org |
| **Politique de confidentialité** | https://pinkin.org/privacy.html |
| **Conditions** | https://pinkin.org/terms.html |
| **Email de contact dev** | cedric.mabilotte@gmail.com |
| **Vidéo de démo** | À enregistrer selon `PLAN_VIDEO_OAUTH.md` |

---

## Scopes demandés

### 1. `https://www.googleapis.com/auth/contacts.readonly`

**Demandé par défaut**, à la première connexion.

#### Why does your app need this scope?

```
Pinkin's single purpose is to display the user's Google Contacts as
pins on an OpenStreetMap. To do this, Pinkin needs to READ the
following fields of each contact:

  - names and photos, to render an identifiable pin and contact card;
  - postal addresses, to geocode them into latitude/longitude
    coordinates via Nominatim (OpenStreetMap);
  - phone numbers and email addresses, so that the contact card can
    open the user's mail client, dialer, SMS app, WhatsApp or Signal;
  - the userDefined field named "GEO" (RFC 6350 format), so a contact
    already geocoded on a previous run is rendered instantly without
    re-querying Nominatim.

Without read access to Google Contacts, the app has nothing to put on
the map. The readonly scope is the minimum that enables the feature.
```

#### How will the requested scope improve user experience?

```
The user sees their Google address book on a map without any manual
data entry or duplicate copy. The contacts they already manage in
Google Contacts are exactly what appears on the map — no parallel
storage, no syncing chore.
```

#### Demonstrate that this is the minimum scope needed.

```
contacts.readonly is the narrowest scope that exposes the People API
fields the app needs (names, addresses, phones, emails, userDefined).
contacts.other.readonly would not return user-managed contacts.
Directory scopes would not return the contacts the user has explicitly
created. profile / userinfo.email are not used.
```

---

### 2. `https://www.googleapis.com/auth/contacts`

**Demandé uniquement après opt-in explicite** — un bouton dédié dans
l'UI déclenche un second consentement Google. Tant que l'utilisateur ne
l'active pas, Pinkin reste en lecture seule.

#### Why does your app need this scope?

```
Pinkin needs WRITE access to Google Contacts solely to persist the
geographic position of each contact back into the contact itself, in
the standard GEO field (RFC 6350). Two write operations:

  1. After Nominatim has geocoded a contact's address, Pinkin writes
     the resulting "geo:lat,lon" string into the contact's userDefined
     field named "GEO". This is the standard way to attach a location
     to a vCard / Google contact. On subsequent openings, the position
     is read instantly without re-geocoding.

  2. If the user notices an address is wrong (the pin landed in the
     wrong place), they can correct the postal address from the
     contact card; Pinkin writes the corrected address back to the
     contact's "addresses" field and refreshes the GEO accordingly.

Both operations are user-initiated: writing requires the user to (a)
click an explicit "Allow write access" button, which triggers Google's
incremental consent screen, and (b) confirm each correction in the
contact card.

Pinkin does NOT modify any other field of the contact (no name change,
no photo change, no merging, no deletion). The scope is requested only
because Google's contacts API does not expose a narrower
"contacts.write.geo" sub-scope; the standard "contacts" scope is the
narrowest grant that allows updating any field.
```

#### How will the requested scope improve user experience?

```
Geocoding 200+ contacts on first run takes minutes (rate-limited to 1
request/second by Nominatim's usage policy). Persisting the result
back into the contact's GEO field makes the second opening instant.
Address correction also stops being a chore: the user fixes a wrong
address once, and the corrected address syncs everywhere they use
Google Contacts (other Google products, other devices). The
correction lives where it belongs — in the contact — not in a local
silo Pinkin would own.
```

#### Demonstrate that this is the minimum scope needed.

```
Google's People API does not expose a finer-grained write scope (no
"contacts.write.geo", no "contacts.write.userDefined"). The
"contacts" scope is the narrowest grant Google offers that allows
updating any field of an existing contact. Pinkin asks for it only
when the user opts in to writing, never by default.
```

---

## Limited Use Disclosure (statement to paste verbatim)

À placer dans le champ « Limited Use Disclosure » du formulaire OAuth.

```
Pinkin's use and transfer of information received from Google APIs to
any other app will adhere to the Google API Services User Data Policy,
including the Limited Use requirements.

Specifically:
  - User data is used only to provide and improve user-facing features
    that are prominent in the requesting application's UI (display
    contacts as pins on a map, contact-card actions, optional
    address/GEO correction);
  - User data is not transferred to others except as necessary to
    provide or improve user-facing features (no third-party transfer
    occurs: Pinkin has no server; the only data transmitted leaves the
    user's browser to (a) Google itself, (b) OpenStreetMap Nominatim
    for geocoding the user's contacts' postal addresses, and (c) the
    OpenStreetMap tile servers for the map background);
  - User data is not used to serve advertising;
  - No human, including the application's developer, reads the user
    data, except (i) with the user's affirmative agreement,
    (ii) for security purposes, (iii) to comply with applicable law,
    or (iv) for operations where the data is aggregated and used for
    internal operations as permitted under the policy.
```

---

## Architecture sécurité — éléments à mentionner si Google le demande

| Point | Réalité Pinkin |
|---|---|
| **Backend** | Aucun. L'application est 100 % client-side (extension Chrome MV3 ou PWA statique servie sur pinkin.org). |
| **Stockage refresh token** | Chiffré AES-GCM 256 via WebCrypto API. Clé maître générée à l'installation, stockée localement, ne quitte jamais le navigateur. Implémentation : `core/crypto.js`, tests : `test/crypto.test.js` (7 cas). |
| **Auth flow** | Extension : `chrome.identity.launchWebAuthFlow` + Authorization Code Flow + PKCE (RFC 7636). PWA : Authorization Code Flow + PKCE (RFC 7636). Google traite tout client OAuth de type « Application Web » comme confidentiel et exige le `client_secret` à l'échange de code, même en flux PKCE — le secret est donc embarqué dans le code public et le risque est borné par le verrouillage du client OAuth sur ses URI de redirection enregistrées (`chromiumapp.org` côté extension, `pinkin.org` côté PWA). Voir `core/auth/pkce-auth.js` (en-tête). |
| **Niveau de scope par défaut** | `contacts.readonly`. Le scope `contacts` n'est demandé que sur action utilisateur (opt-in incrémental). |
| **Open source** | Code intégral sur GitHub (`github.com/CedricMabilotte/`), auditable. |
| **Aucun analytics** | Aucun GA, aucun Sentry, aucun Mixpanel, aucun cookie tiers. Vérifiable par inspection réseau. |

---

## Domaines à vérifier (Domain Verification)

Google exige la vérification de propriété du domaine où sont hébergées la
homepage, /privacy et /terms.

| Domaine | Méthode recommandée |
|---|---|
| `pinkin.org` | Vérification via Search Console : enregistrement TXT DNS chez Gandi, ou fichier HTML à la racine. Le fichier HTML est plus simple à automatiser une fois l'hébergeur retenu (cf. `HEBERGEUR_PWA.md`). |

---

## Checklist avant soumission OAuth

- [ ] `pinkin.org` accessible en HTTPS (dépend de l'hébergeur retenu)
- [ ] `/privacy.html` accessible en HTTPS
- [ ] `/terms.html` accessible en HTTPS
- [ ] Domaine `pinkin.org` vérifié dans Google Search Console
- [ ] Écran de consentement OAuth complet (logo, nom, contact, liens)
- [ ] Vidéo de démo enregistrée (cf. `PLAN_VIDEO_OAUTH.md`)
- [ ] Texte « Why does your app need this scope » copié pour `contacts.readonly`
- [ ] Texte « Why does your app need this scope » copié pour `contacts`
- [ ] Limited Use Disclosure copiée
- [ ] Soumis pour revue

*Le processus Google peut prendre de quelques jours à plusieurs semaines,
avec possibles itérations (Google peut demander des éclaircissements ou un
réenregistrement de la vidéo). C'est le vrai chemin critique de V1, pas le
code.*
