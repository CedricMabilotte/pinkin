# Plan de captation — vidéo de démonstration OAuth

*Préalable V1.0. Google exige une vidéo qui démontre l'usage des scopes
demandés pour la validation OAuth scope sensible. Session #8.*

---

## Cahier des charges Google

| Critère | Exigence |
|---|---|
| **Format** | MP4 recommandé. Autres formats acceptés (MOV, WebM) mais MP4 = défaut sûr. |
| **Hébergement** | Upload YouTube **non-listé** (unlisted). Lien collé dans le formulaire OAuth. Ne pas mettre en privé : l'examinateur Google doit pouvoir cliquer sans demande d'accès. |
| **Durée** | Pas de plafond imposé. Cible pratique : **3 à 5 minutes**. Moins de 2 min = soupçon de superficialité ; plus de 7 = lassitude examinateur. |
| **Résolution** | 1080p minimum. 720p toléré. Lisibilité des libellés UI = priorité. |
| **Langue** | Audio anglais préférable (l'examinateur peut être hors francophonie). Sous-titres anglais si l'audio est en français. Sinon : texte à l'écran en anglais. |
| **Contenu obligatoire** | (1) URL de l'app visible dans la barre du navigateur, (2) écran de consentement OAuth de Google montré en clair, (3) usage *concret* de chaque scope demandé. |
| **À ne PAS faire** | Pas de montage qui couperait l'écran de consentement (le risque #1 de rejet). Pas d'effets vidéo qui masquent le contenu. Pas de musique de fond couvrant les explications. |

---

## Storyboard — 5 actes, ~4 minutes

### Acte 1 — Identité et contexte (~30 s)

**À l'écran.** Page d'accueil de la PWA sur `https://pinkin.org` (URL
visible). Logo Pinkin, accroche « Pin your loved ones on the map ».

**Voix off / texte.**
> « This is Pinkin, a web app at pinkin.org and a Chrome extension. Its
> single purpose is to show your Google Contacts as pins on an
> OpenStreetMap. I'm about to demonstrate why it needs the OAuth scopes
> we're requesting: `contacts.readonly` first, and `contacts` second,
> only after the user explicitly opts in. »

### Acte 2 — Le scope `contacts.readonly` — consentement et lecture (~1 min)

**À l'écran.**
1. Clic sur le bouton **« Connect Google Contacts »**.
2. **Écran de consentement Google** plein écran, lisible — *montrer le
   scope `contacts.readonly` listé*, et l'URL Google
   (`accounts.google.com`).
3. Clic sur « Allow / Autoriser ».
4. Retour sur la PWA. La carte se charge, les premiers pins
   apparaissent.

**Voix off / texte.**
> « The user clicks Connect. Google's consent screen appears — note the
> requested scope: read access to Google Contacts. After consent, Pinkin
> reads the user's contacts via the People API: names, photos,
> addresses, phones, emails. The postal addresses are sent to
> OpenStreetMap Nominatim to be geocoded; the resulting coordinates
> place a pin on the map. Without the readonly scope, the app has
> nothing to display. »

### Acte 3 — Usage du scope readonly dans l'UI (~45 s)

**À l'écran.**
1. La carte avec une vingtaine de pins répartis.
2. Clic sur un pin → la **fiche contact** s'ouvre : photo, nom, adresse,
   téléphone, email.
3. Survol successif des boutons d'action : *Email*, *Call*, *SMS*,
   *WhatsApp*, *Signal*.
4. Clic sur *Email* — un brouillon mailto s'ouvre dans le client de
   messagerie (montrer juste le brouillon, fermer sans envoyer).
5. Bascule sur l'onglet **List** — montrer les contacts sans adresse,
   toujours joignables via la liste.

**Voix off / texte.**
> « Each pin opens a contact card built from the readonly data: name,
> photo, postal address, phone, email. The action buttons reach the
> person through the user's mail client, dialer, WhatsApp or Signal —
> all initiated by user clicks. Contacts without an address remain
> reachable through the List tab so they aren't lost. Every field
> displayed here is sourced from `contacts.readonly`. »

### Acte 4 — Le scope `contacts` — opt-in et écriture (~1 min)

**À l'écran.**
1. Clic sur le bouton **« Write »** dans l'en-tête.
2. Popover : « Allow Pinkin to save locations and fix addresses in
   Google Contacts » → bouton **« Allow write access »**.
3. Clic → **second écran de consentement Google** (incremental consent)
   plein écran, montrant explicitement le scope `contacts` (write).
4. Clic sur « Allow ».
5. Retour sur la PWA. Pinkin écrit en arrière-plan les coordonnées GEO
   des contacts déjà géocodés en RAM mais pas encore persistés. Bandeau
   : « N contacts written ».
6. Ouverture d'une fiche contact, clic sur le bouton **« Fix »** à côté
   de l'adresse. Modification du champ adresse. Clic **« Save to
   Google »**.
7. Bandeau : « Address fixed and written to Google. »
8. *Optionnel mais convaincant* : ouvrir Google Contacts dans un
   nouvel onglet, montrer que le champ GEO et l'adresse corrigée sont
   bien là, côté Google.

**Voix off / texte.**
> « Writing is opt-in. The user clicks Write, gets Google's second
> consent screen — this is the `contacts` scope, the narrowest scope
> Google offers that allows updating any field. Pinkin uses it ONLY to
> (1) save the geocoded position into the contact's standard GEO field
> (RFC 6350), so the next opening is instant, and (2) write back a
> corrected address when the user fixes a wrong pin location. No other
> field is ever modified. »

### Acte 5 — Limited Use, conclusion (~30 s)

**À l'écran.** Screen-share statique de la page `/privacy.html` montrant
la section *Limited Use Disclosure*.

**Voix off / texte.**
> « To summarize: Pinkin's use of Google user data adheres to the
> Google API Services User Data Policy, including the Limited Use
> requirements. Data is used only for the user-facing features shown
> here — pinning contacts, contact-card actions, optional GEO and
> address correction. It is never sold, never transferred to a third
> party, never used for advertising, never used to train models, and
> never read by a human, including the developer. The app has no
> server — everything runs in the user's browser. Thank you. »

---

## Préparation technique

### Compte de test à utiliser

Un compte Google **dédié à la démo**, peuplé d'une vingtaine de contacts
fictifs avec adresses postales variées (ne pas utiliser le compte Google
personnel de l'opérateur — la vidéo sera publique sur YouTube unlisted,
visible à toute personne ayant le lien). Suggestions :

- 10 contacts en Europe avec adresses françaises / espagnoles /
  anglaises ;
- 5 contacts en Amérique du Nord ;
- 5 contacts sans adresse, pour démontrer l'onglet *List*.

### Outils d'enregistrement

| Plateforme opérateur | Outil suggéré |
|---|---|
| Linux | **OBS Studio** (gratuit, GitHub) — scènes pré-configurables, capture fenêtre Chrome, audio mic intégré. Alternative : `kazam`, `simplescreenrecorder`. |
| macOS | QuickTime (natif, Cmd+Shift+5) — suffisant si pas besoin de zoom. Sinon Screenflow / ScreenStudio. |

**Réglages OBS recommandés.**
- Sortie : MP4, 1080p, 30 fps, bitrate 6000 kbps (~7-10 Mo / minute).
- Audio : 192 kbps, mono suffit.
- Capture : *Window Capture* sur Chrome, pas *Display Capture* (évite
  d'afficher accidentellement notifications, autres apps).

### Chrome pour la captation

- **Profil propre** (`google-chrome --user-data-dir=/tmp/oauth-demo-profile`)
  — pas d'extensions parasites, pas de favoris, pas d'historique.
- Zoom 110-120 % pour la lisibilité.
- Fermer le terminal et tout ce qui n'est pas le navigateur avant de
  lancer.

### Voix vs texte à l'écran

| Option | Pour | Contre |
|---|---|---|
| **Voix off anglais** | Le plus naturel pour l'examinateur. | Demande une re-prise si on bafouille ; accent. |
| **Texte à l'écran + musique douce** | Aucun risque de prononciation. Reproductible. | Plus long à monter ; lecture sur écran fatigante. |
| **Voix off français + sous-titres anglais** | Confortable pour l'opérateur. | Risque mineur que l'examinateur ne lise pas. |

*Recommandation : voix off anglaise simple, lente, avec un script lu —
inutile de réciter de mémoire. Un peu d'accent français ne dérange pas
Google.*

---

## Script à lire (anglais, ~4 min lus normalement)

```
This is Pinkin, a web application at pinkin.org and a Chrome extension.
Its single purpose is to display the user's Google Contacts as pins on
an OpenStreetMap. I'm about to demonstrate why it needs two OAuth
scopes: contacts.readonly first, and contacts second, only after the
user explicitly opts in.

[clic Connect]

The user clicks Connect Google Contacts. Google's consent screen
appears — note the requested scope: read access to Google Contacts.
After consent, Pinkin reads the user's contacts via the People API:
names, photos, postal addresses, phones, emails. The addresses are
sent to OpenStreetMap Nominatim to be geocoded into coordinates; the
resulting coordinates place a pin on the map. Without this readonly
scope, the app has nothing to display.

[montrer la carte avec pins]

Each pin opens a contact card built from the readonly data. The action
buttons let the user reach each person through their mail client,
dialer, WhatsApp or Signal — all initiated by user clicks.

[clic sur un pin, ouverture fiche]

Contacts without an address remain reachable through the List tab, so
they aren't lost.

[onglet List]

Now the second scope. Writing is opt-in. The user clicks Write…

[clic Write]

… and gets Google's second consent screen — this is the contacts
scope, the narrowest scope Google offers that allows updating any
field. We use this scope ONLY to save the geocoded position into the
contact's standard GEO field, so the next opening is instant, and to
write back a corrected address when the user fixes a wrong pin
location. No other field is ever modified.

[consentement, retour app, écriture en arrière-plan]
[clic Fix sur un contact, correction adresse, Save]

To summarize: Pinkin's use of Google user data adheres to the Google
API Services User Data Policy, including the Limited Use requirements.
Data is used only for the user-facing features shown here, never sold,
never transferred to a third party, never used for advertising, never
used to train models, and never read by a human — including the
developer. The application has no server: everything runs in the
user's browser.

Thank you.
```

---

## Liste des prises à enregistrer

Pour ne rien oublier en condition réelle :

1. **Prise A — boot et `contacts.readonly`** (de l'accueil au premier
   pin cliqué). 1 min.
2. **Prise B — usages readonly** (fiche contact, actions, onglet
   Carnet). 45 s.
3. **Prise C — opt-in `contacts`** (Write → consent → écriture en
   arrière-plan). 45 s.
4. **Prise D — correction d'adresse** (fiche, Fix, formulaire, Save).
   30 s.
5. **Prise E — Limited Use** (capture statique de /privacy.html avec
   surlignage de la section). 30 s.

*Faire chaque prise 2 ou 3 fois et garder la meilleure. Monter dans
n'importe quel éditeur (Kdenlive sous Linux, iMovie sous macOS, Shotcut
multi-plateforme).*

---

## Upload et lien

1. YouTube → Upload → **Unlisted** (Non répertoriée). Ne pas mettre en
   privé.
2. Titre : `Pinkin OAuth verification — scope demo`.
3. Description : un paragraphe court rappelant le contexte + lien vers
   `pinkin.org` et `/privacy.html`.
4. Copier le lien YouTube dans le champ « OAuth Verification → Demo
   Video URL » du formulaire Google Cloud Console.

---

## Pièges fréquents (causes de rejet)

| Erreur | Comment l'éviter |
|---|---|
| L'écran de consentement Google n'est pas montré ou est flou. | Bien plein écran, lecture 2 s minimum, pas de transition rapide. |
| L'URL de l'app n'est pas visible dans la barre. | Garder Chrome non-zoomé en hauteur, barre URL visible en permanence. |
| Le scope n'est pas démontré *en usage*. | Acte 3 et acte 4 sont obligatoires — pas qu'un screenshot du consentement. |
| Vidéo en mode privé YouTube. | **Unlisted**, pas privé. L'examinateur n'a pas le compte de l'opérateur. |
| Mention de données qui ne sont pas mentionnées dans la fiche /privacy. | Garder le script aligné avec privacy.html. Si on parle d'un champ, il doit être listé dans la politique. |
