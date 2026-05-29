# Destinataires de la diffusion V1 — Pinkin

*Document interne, exclu de la publication via `.assetsignore`.*

Liste qualifiée des canaux et personnes à atteindre pour la diffusion
post-publication CWS. Issue du MARS-strat S9-ter.

## Posture

Pinkin = produit de **posture** (zéro serveur, AGPL, geek libertaire).
Cible = cercles open source puristes + privacy advocates.
Stratégie = artisanal et ciblé, pas growth massif.

---

## Posts auto-publiés — semaine 1

| Canal | Format | Quand | Pitch |
|---|---|---|---|
| **Hacker News** | Show HN | jour J ouvrable, 14h UTC (= pic US/EU) | « Show HN: Pinkin — your Google Contacts on a map, zero servers, AGPL » |
| **r/privacy** | Self post | jour J+1 | « I built a privacy-respecting alternative to Google Contacts map view » |
| **r/webdev** | Self post | jour J+2 | « Show: Open source Chrome ext + PWA, zero deps beyond Leaflet » |
| **r/chrome** | Self post | jour J+3 | « New Chrome extension to see Google Contacts on a map » |
| **Mastodon Fediverse** | Toot + thread | jour J | hashtags `#privacy #FOSS #OpenSource #AGPL #PinkinApp` |
| **LinkedIn** (Cédric) | Post | jour J+2 | angle indie maker / posture éthique |

### Brouillon Show HN

```
Show HN: Pinkin — your Google Contacts on a map, zero servers, AGPL

I wanted to see where my contacts live on a map without uploading them
to a third-party service. The existing options either had a server I
couldn't audit, a paywall, or hadn't been updated since 2019.

So I built it.

  - Chrome extension (MV3) + PWA at https://pinkin.org
  - Reads Google Contacts via People API (read-only by default)
  - Geocodes via OpenStreetMap Nominatim
  - Optional opt-in: writes the GEO coordinate back to the contact
  - Zero server, zero analytics, zero tracker. AGPL-3.0.
  - The client_secret is publicly readable because that's how Google
    "Web" OAuth clients work — protection comes from the redirect URI
    lockdown, not the secret. Full honest writeup in
    JUSTIFICATION_OAUTH.md if you want to chase that thread.

The whole thing is one person's weekend project, no business model,
no roadmap of features beyond V1. If you have feedback on the
privacy posture, security setup, or the AGPL choice, I'm here.

Source: https://github.com/CedricMabilotte/pinkin
Demo: https://pinkin.org/pwa/
```

---

## Mailing personnel — semaine 1-2

3-5 personnes max. Email court (~ 8 lignes). Pas de relance.

### Cible francophone

1. **Framasoft / Framablog** — `contact@framasoft.org`
   Angle : « projet libre francophone, AGPL, alternative degooglization
   partielle, peut-être de l'intérêt pour Framalibre. »

2. **Sébastien Sauvage** (sebsauvage.net) — formulaire de contact site
   Angle : « projet bien aligné avec ton positionnement minimaliste +
   antitracking, code reproductible, à toi de juger. »

3. **Stéphane Bortzmeyer** (blog DNS/sécurité, bortzmeyer.org)
   Angle : « j'ai écrit un texte JUSTIFICATION_OAUTH.md qui explique
   honnêtement pourquoi le client_secret reste public ; ça peut
   t'intéresser comme cas d'étude. »

4. **Tristan Nitot** (Standblog) — formulaire de contact
   Angle : « indie maker post-Mozilla, posture privacy radicale,
   AGPL — pourrait te parler. »

### Cible internationale

5. **Drew DeVault** (drewdevault.com) — `sir@cmpwn.com`
   Angle : « another self-hosted-by-design tool, AGPL'd, zero servers,
   reproducible builds. May or may not interest you for a mention. »

6. **switching.software** — formulaire de soumission
   Angle : « submit a new project to the directory »

7. **privacyguides.org** — forum / Pull Request sur GitHub
   Angle : « submit to community-curated tools list »

### Template d'email (EN, à personnaliser)

```
Subject: [Pinkin] open source tool you might want to look at

Hi [name],

I built Pinkin (https://pinkin.org), a Chrome extension + PWA that puts
Google Contacts on an OpenStreetMap. Zero servers, AGPL-3.0, reproducible
builds. Single person, no funding, no business model.

I'm reaching out because [one specific reason this person specifically
might care — privacy posture, FOSS ethos, FR ecosystem alignment, etc.].

Code: https://github.com/CedricMabilotte/pinkin
Honest tech writeup (incl. the OAuth secret situation):
  https://github.com/CedricMabilotte/pinkin/blob/main/JUSTIFICATION_OAUTH.md

No pressure to respond, just thought you might find it interesting.

— Cédric
```

---

## Veille à activer

- **Google Alerts** sur `"pinkin"`, `pinkin.org`, `cedricmabilotte/pinkin`
  pour capter toute mention organique.
- **HN search** : `hn.algolia.com` sur `pinkin`
- **GitHub stars trend** : `github.com/CedricMabilotte/pinkin/stargazers`

---

## Métriques de succès à 90 jours

(Reprise du MARS-strat synthèse cycle 3.)

- ☐ At least one reputable security/privacy reviewer publicly endorses Pinkin.
- ☐ Repo at least 50 stars.
- ☐ At least 200 active weekly users (proxy via Tally survey + issues).
- ☐ Zero rejection on Google OAuth verification.

3/4 atteints = Pinkin est durablement légitime.
