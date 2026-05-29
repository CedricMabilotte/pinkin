# Hébergeur de la PWA — analyse comparée

*Préalable V1.0. Issu de la qualification cadrée en session #8. Décision
opérateur tranchée en session #9 (cf. section « Choix retenu » plus bas).*

---

## Choix retenu — Cloudflare Pages (opérateur, S9-bis)

Décision opérateur : **Cloudflare Pages** depuis le repo GitHub privé,
ce qui revient à la recommandation S8 d'origine.

### Historique du revirement

Premier arbitrage S9 : opérateur tranche GitHub Pages pour alignement
avec son parc (5 sites Astro/Grav). Section actée en début de session.

Revirement S9-bis : le passage à GitHub Pages exigeait de rendre le
repo `pinkin` public — préalable du plan Free. Or, l'audit
inter-artefacts S9 (d) a rappelé que deux `CLIENT_SECRET` Google sont
en clair dans le code suivi (`extension/background/auth-worker.js` l. 33,
`pwa/platform-pwa.js` l. 28), depuis `db6d9bd`. La décision #5 héritée
était : **repo privé pour ne pas matérialiser le risque**. Passer le
repo public le matérialise — et l'audit (d) a précisément renforcé
l'argumentaire honnête de ce risque dans `JUSTIFICATION_OAUTH.md`.

L'opérateur tranche donc en bascule : **conserver la posture
sécurité #5 (repo privé), choisir l'hébergeur qui s'en accommode**.
Cloudflare Pages supporte les repos GitHub privés via leur app GitHub
installée — le code source reste privé, Cloudflare lit le repo en
lecture seule pour déployer. Aucun secret n'est exposé sur GitHub.

### Avantages connexes (de retour à la reco S8)

- Latence Europe meilleure que GitHub Pages (CDN plus dense).
- **Aucun quota de bande passante** — élimine définitivement le scénario
  « la fiche CWS prend, je découvre une facture un samedi matin ».
- Support natif du custom domain `pinkin.org` via CNAME chez Gandi (NS
  Gandi conservés, le reste du parc DNS de l'opérateur ne bouge pas).
- Headers configurables par `_headers` à la racine si on durcit la CSP
  plus tard.

### À faire (recette ci-dessous, section « Si Cloudflare Pages »)

1. Compte Cloudflare (gratuit) — créer si pas déjà fait.
2. Pages → Connect to Git → app GitHub installée, sélectionner repo
   `pinkin` (privé — fonctionne).
3. Build settings : Framework preset *None*, Build command *vide*,
   Output directory `/`.
4. Custom domain `pinkin.org` → CNAME chez Gandi vers
   `pinkin-org.pages.dev`.
5. Push `main` → Cloudflare déploie en ~30 s. HTTPS auto.

---

## Le besoin réel

Pinkin n'est pas une vraie application en deux couches : c'est un paquet de
fichiers statiques (HTML, JS, CSS, images, manifest, service-worker) qui
s'auto-suffit dans le navigateur. **Aucune fonction serveur, aucune base, aucun
build pesant** (Leaflet bundlé local, code vanilla, pas de framework). Ce que
l'hébergeur doit faire est minimal mais doit être fait *correctement* :

1. **Servir des fichiers statiques en HTTPS**, custom domain `pinkin.org`,
   certificat auto-renouvelé.
2. **Préserver le scope du service worker** — `service-worker-pwa.js` veut
   contrôler la racine, donc l'hébergeur doit servir ce fichier sans
   manipulation du `Service-Worker-Allowed:` header.
3. **Servir `/privacy` et `/terms`** (deux pages statiques) sur le même
   domaine — exigence Google pour la validation OAuth scope sensible.
4. **Build trivial ou pas de build** — Pinkin n'a pas d'étape `npm run
   build`. Il faut un hébergeur capable de servir un répertoire tel quel.
5. **Pas de mauvaise surprise sur l'offre gratuite** — Pinkin reste personnel
   (Critère B de la routine : « audience proche »). Tomber d'un palier
   gratuit après le lancement public serait un drame disproportionné.

Critères secondaires :
- intégration `git push` → déploiement automatique (zéro friction) ;
- contrôle des headers (CSP, COOP/COEP — optionnel mais sain pour une PWA) ;
- redirection automatique `http → https` et `www → apex` ;
- bonne latence en Europe (le public initial est francophone).

Hors critères : analytics intégré (on n'en veut pas — invariant « Pas de
tracking »), fonctions edge (inutile sans backend), aperçus de PR
(non-pertinent pour une release perso).

---

## Les quatre candidats

### Cloudflare Pages

**Modèle.** Hébergement statique adossé au réseau CDN Cloudflare. Déploiement
par git connect (GitHub / GitLab) ou via Wrangler CLI.

**Offre gratuite (à 2026-05).**
- Builds : 500 par mois.
- Requêtes : illimitées.
- Bande passante : illimitée.
- Sites simultanés : 100.
- Custom domain : oui, sans coût additionnel.
- HTTPS : géré, Let's Encrypt-style auto-renouvelé.

**Points forts pour Pinkin.**
- *Latence Europe* — Cloudflare a un PoP dans à peu près toutes les grandes
  villes européennes. Le ping perçu sera meilleur que la plupart des
  alternatives.
- *Headers* — `_headers` à la racine permet de définir CSP, COOP, etc.
- *Pas de quota de bande passante* — c'est ce qui distingue le plus
  Cloudflare des autres : aucun risque de facture surprise même si la PWA
  trouve son public.
- *Pas de mise en veille* — toujours servi instantanément.

**Points faibles.**
- *Build settings* simples mais opaques : si on doit déboguer un déploiement
  raté, l'UI Cloudflare est moins lisible que Netlify.
- *Dépendance Cloudflare* — l'opérateur a un peu de Cloudflare déjà ?
  À vérifier. Si non, c'est un nouveau compte à provisionner.
- *Lock-in DNS léger* — pour profiter au maximum du réseau, il faut souvent
  bouger les NS chez Cloudflare, ce qui sort du contrôle Gandi habituel.
  Évitable : on peut rester chez Gandi en pointant simplement un CNAME vers
  `pinkin.pages.dev`.

### Netlify

**Modèle.** Pionnier du Jamstack, hébergement statique + functions.
Déploiement par git connect ou CLI.

**Offre gratuite (à 2026-05).**
- Bande passante : 100 GB/mois.
- Build minutes : 300/mois (largement suffisant — Pinkin a pas de build).
- Sites simultanés : illimité.
- Custom domain + HTTPS : oui.

**Points forts pour Pinkin.**
- *UI la plus lisible* du panel — la plus facile à apprivoiser sans recette.
- *Aperçus de déploiement* (preview deploys) sur chaque push de branche —
  utile pour valider une modif PWA avant `main`.
- *Headers et redirects* via `_headers` et `_redirects` — déjà le standard
  copié par Cloudflare.

**Points faibles.**
- *Quota bande passante 100 GB/mois.* Pour Pinkin perso : largement
  suffisant. Pour un succès public : à surveiller. Au-delà, pas de coupure
  mais facturation à l'usage (~55 $ pour 100 GB supplémentaires) — c'est le
  risque facture surprise si la fiche CWS prend.
- *Latence Europe* correcte mais inférieure à Cloudflare (CDN moins dense).
- *Cold start sur premier hit* parfois perceptible.

### Vercel

**Modèle.** Concurrent direct de Netlify, plus orienté Next.js. Hébergement
statique parfaitement supporté.

**Offre gratuite (à 2026-05, plan « Hobby »).**
- Bande passante : 100 GB/mois.
- Build minutes : 6 000/mois.
- Custom domain + HTTPS : oui.
- *Limite explicite : usage non commercial uniquement* (Hobby plan).

**Points forts pour Pinkin.**
- *Performance* — réseau edge mondial, latence excellente.
- *DX* (developer experience) souvent citée comme la meilleure du marché.

**Points faibles, à fort impact pour Pinkin.**
- *Clause « non commercial »* du Hobby. Pinkin est non-commercial par
  invariant, donc compatible — mais le jour où le projet héberge une porte
  vers Freechi (Phase D2, différée) ou des fonctions communautaires, la
  clause peut devenir contraignante.
- *Quota bande passante 100 GB/mois* — même risque que Netlify.
- *Vercel est positionné autour de Next.js* — pour un site vanilla, c'est
  surdimensionné.

### GitHub Pages

**Modèle.** Hébergement statique gratuit pour les dépôts GitHub. Le plus
sobre, le plus prévisible.

**Offre gratuite.**
- Bande passante : 100 GB/mois (soft limit, GitHub n'a jamais agressivement
  facturé au-delà).
- Sites simultanés : 1 par dépôt + 1 par organisation/utilisateur.
- Custom domain + HTTPS : oui (Let's Encrypt).
- Build : Jekyll natif, ou « pas de build » pour servir des fichiers tels
  quels.

**Points forts pour Pinkin.**
- *Le plus simple à comprendre* — un fichier `.nojekyll` à la racine,
  l'hébergement sert le dépôt tel quel. Zéro magie.
- *Aucun nouveau compte* — le dépôt Pinkin est déjà sur
  `CedricMabilotte/...`. Activation = un toggle dans Settings → Pages.
- *Aucune dépendance externe* au-delà de GitHub, déjà utilisé pour
  l'ensemble des autres sites (freechi, troisiemesvoix, mabilotte, goorg,
  igor — cf. `agents/CLAUDE.md`).

**Points faibles.**
- *Headers non configurables* — pas de `_headers`. Si on a besoin de CSP
  stricte ou de COOP/COEP pour la PWA, GitHub Pages ne suit pas.
- *Pas de fonctions* (mais on n'en veut pas).
- *Pas d'aperçus de PR* automatiques.
- *Cache CDN parfois lent à s'invalider* après un push (quelques minutes).

---

## Synthèse — recommandation

**Recommandation : Cloudflare Pages.**

Le raisonnement, dans l'ordre des critères du besoin réel :

- *Pas de quota de bande passante* — c'est l'unique candidat qui élimine
  *définitivement* le scénario « la fiche CWS prend, je découvre une facture
  un samedi matin ». Pour un projet qu'on lance publiquement sans savoir
  combien de monde va l'installer, c'est le critère qui pèse le plus.
- *Latence Europe* meilleure que Netlify et GitHub Pages, équivalente à
  Vercel.
- *Custom domain `pinkin.org`* propre via CNAME (NS Gandi conservés —
  important, le reste du parc DNS de l'opérateur reste chez Gandi).
- *Service worker scope* respecté nativement.
- *Headers* configurables par `_headers` (utile si on durcit la CSP).

**Alternative défendable : GitHub Pages**, si la priorité est *simplicité
maximale et alignement avec le reste du parc* (les 5 sites de l'opérateur
sont déjà chez GitHub via Astro/Grav). Le seul risque réel est la bande
passante, qui n'est en pratique jamais appliquée par GitHub pour les sites
modestes — mais c'est un risque non-documenté. Pour Pinkin perso et cercle
proche, c'est suffisant et c'est zéro effort de provisionnement.

**À écarter pour Pinkin : Vercel et Netlify.** Pas pour défaut technique
mais parce que (a) le quota bande passante de 100 GB/mois crée un risque
asymétrique le jour d'un pic ; (b) Vercel a une clause « non commercial » qui
ferme une porte que le projet n'a pas encore décidé de laisser fermée à
jamais.

---

## Mise en œuvre (recette pour le choix retenu)

Si **Cloudflare Pages** :

1. Compte Cloudflare (gratuit) — créer si pas déjà fait.
2. Pages → Connect to Git → sélectionner le dépôt Pinkin.
3. Build settings : *Framework preset : None*, *Build command : (vide)*,
   *Output directory : /*. Pinkin sert le dépôt tel quel.
4. Custom domain : `pinkin.org` → Cloudflare donne un CNAME à pointer chez
   Gandi (`CNAME pinkin.org → pinkin-org.pages.dev`).
5. Mettre `service-worker-pwa.js` à la racine (déjà le cas).
6. Vérifier qu'un fichier `_headers` à la racine, optionnel, permettrait de
   poser `Service-Worker-Allowed: /` si jamais on déplaçait le SW — pas
   nécessaire en l'état.
7. Push `main` → Cloudflare build et déploie en ~30 s. HTTPS automatique.

Si **GitHub Pages** :

1. Repo Settings → Pages → Source : `main` branch, `/` root.
2. Custom domain : `pinkin.org` → Pages crée un fichier `CNAME` à la racine.
   Chez Gandi : `CNAME pinkin.org → cedricmabilotte.github.io`.
3. Ajouter `.nojekyll` à la racine du dépôt (sinon Jekyll mange les fichiers
   commençant par `_`).
4. Cocher « Enforce HTTPS » une fois le certificat émis (~10 min).

---

## Pages annexes /privacy et /terms

Sur les deux options retenues, `/privacy` et `/terms` sont servies comme
fichiers statiques à la racine — `pinkin.org/privacy.html` et
`pinkin.org/terms.html`. Réécriture sans extension possible mais pas
indispensable (Google accepte les URLs `.html`).

---

## Coût récurrent

| Option | Coût récurrent |
|---|---|
| Cloudflare Pages | 0 € — pas de quota bloquant |
| GitHub Pages | 0 € — soft limit jamais appliquée pour les sites perso |
| Netlify | 0 € jusqu'à 100 GB/mois, puis ~55 $/100 GB |
| Vercel | 0 € jusqu'à 100 GB/mois, puis facturation Hobby → Pro à 20 $/mois |

Le seul coût réellement engagé reste le domaine `pinkin.org` chez Gandi
(déjà payé).
