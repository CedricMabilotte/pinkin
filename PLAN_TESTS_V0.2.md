# Plan — Tests automatisés Pinkin (session #6 → V1)

*Établi en session #6. Cadre l'infrastructure de tests qui valide V0.2 et
servira de filet pour V1 et au-delà. Décision opérateur : viser le critère B
(« la suite de tests prouve effectivement que ça marche »), pas seulement un
filet de non-régression.*

---

## Stack retenue

| Couche | Outil | Rôle | Réutilisable hors Pinkin |
|---|---|---|---|
| Unit pur (Node) | **Vitest** | modèles, services sans DOM | oui |
| Unit DOM léger | **Vitest + happy-dom** | orchestrator, carnet, contact-panel, sans navigateur | oui |
| E2E navigateur | **Playwright** | PWA (boot, navigation, popovers, focus), extension MV3 | oui |
| CI | **GitHub Actions** | lance unit + E2E à chaque push | oui |
| Vérif visuelle interactive | **Claude in Chrome** | jugements UX que Playwright ne tranche pas | usage Cowork |

**Choix tenus.** Vitest plutôt que `node:test` parce que c'est lui qui apporte
DOM, coverage, watch, UI, mocks dans un seul écosystème — et qu'il est ré-
employable tel quel sur `freechi-org`, `troisiemesvoix-org`, `goorg-site`,
`igor-site`. Playwright plutôt que Cypress/Puppeteer parce que c'est le seul à
porter sérieusement les extensions MV3 et qu'il sait persister l'état d'auth
(`storageState`) — on fera OAuth Google une fois, on rejouera mille fois.
happy-dom plutôt que jsdom parce que ~3× plus rapide et adopté par
l'écosystème Vite.

**Tout ce kit est générique** : zéro logique spécifique à Pinkin ou au fork
Freechi. Les fichiers `vitest.config.js`, `playwright.config.js` et le
workflow CI sont copiables tels quels sur les autres dépôts.

---

## Matrice — TEST_V0.2.md ↔ ce qui s'automatise

| # | Test manuel | Automatisable ? | Comment |
|---|---|---|---|
| A1 | Chargement extension `chrome://extensions` | non | manuel (charge non empaquetée) |
| A2-A6 | Première connexion OAuth | partiel | `storageState` après un OAuth manuel unique |
| A7 | Synchro + géocodage | oui | Playwright + mocks `fetch` (Google + Nominatim) |
| A8 | Cache | oui | Playwright |
| B9 | Carnet : tri, filtre, recherche | oui | Vitest + happy-dom (logique) + Playwright (rendu) |
| B10-11 | Ouverture de fiche depuis Carte / Carnet | oui | Playwright |
| C12 | mailto (ouvre mailto:) | partiel | Playwright vérifie le `href` ; pas l'app externe |
| C13 | tel | partiel | idem (vérif du lien) |
| C14 | SMS / WA / Signal | partiel | idem |
| D15 | Import .vcf | oui | Vitest (parseur — déjà fait) + Playwright (input file) |
| E16-19 | Écriture : popover, états, retrait | oui | Vitest (machine d'états) + Playwright (interactions) |
| G20 | Déconnexion popover (P3) | oui | Playwright |
| G21 | Opt-in écriture depuis Fiche (P2) | oui | Playwright |
| G22 | Focus trap (P4) | oui | Playwright (Tab → vérif que le focus reste) |
| F | PWA — boot | ✓ **fait #6** | `e2e/pwa/boot.spec.js` |
| F | PWA — OAuth callback | partiel | `storageState` après un OAuth manuel unique |

**Lecture.** Sur 22 points du test plan, 17 sont entièrement automatisables, 4
le sont partiellement (Playwright vérifie le lien, pas l'app externe — ce qui
est correct), 1 reste manuel (charger l'extension dans Chrome la première
fois).

---

## Ce qui ne sera pas automatisé — et pourquoi

- **Le flow OAuth Google de bout en bout.** Google détecte les flows
  automatisés et les bloque (CAPTCHA, mot de passe refusé). Stratégie :
  l'opérateur le fait *une fois* via `playwright codegen` ; Playwright sauve
  `e2e/.auth/storageState.json` ; tous les tests « authenticated » repartent
  connectés. Si le token expire (7 jours en mode test), on refait l'opération.
- **L'écriture réelle dans Google Contacts.** Tant qu'on n'a pas de compte
  dédié aux tests, on ne veut pas écrire dans un vrai carnet en boucle. Soit
  on introduit un mode `Platform.auth.mock` (à décider, cf. Q3 du cadrage),
  soit on s'en tient aux scénarios qui ne déclenchent pas d'écriture.
- **Le rendu visuel Leaflet.** Difficile à automatiser sans tests de
  régression visuelle (Percy, Chromatic) — coût et complexité disproportionnés
  à ce stade. Claude in Chrome y supplée en mode interactif.
- **Les apps externes** (client mail, app téléphone) : on vérifie le `href`,
  pas le comportement du système d'exploitation à la réception du lien.

---

## Séquence d'exécution (#6 et au-delà)

### Fait en #6 (à clôturer)

1. ✓ Installation `vitest + happy-dom + @playwright/test`.
2. ✓ Migration des 36 tests `node:test` → Vitest.
3. ✓ Premier scénario E2E PWA — boot sans erreur console, écran d'accueil
   visible, manifeste 200 à la racine. **Régression du bug #5 fermée.**
4. ✓ Config Playwright avec démarrage automatique de `dev:pwa` si nécessaire,
   utilisation du Chrome système (`channel: 'chrome'` — pas de download
   Chromium dans le sandbox).
5. ✓ `.gitignore` enrichi (playwright-report, test-results, coverage,
   e2e/.auth).
6. À FAIRE : workflow GitHub Actions (CI sur push/PR).
7. À FAIRE : élargir l'unit — `geocoder` (mock fetch Nominatim),
   `vcard-writer`, `contacts-sync`, puis orchestrator (mocks Platform.auth +
   fetch + storage) — couvre les modules `[SUPPOSÉ]` de #5.
8. À FAIRE : scénarios E2E supplémentaires sans auth — bascule onglets,
   ouverture popover d'écriture (états de repos), focus trap de la Fiche
   (P4) en injectant un faux contact via JS dans la page.

### À programmer (sessions suivantes)

9. **OAuth via storageState** (#10) — OPS de l'opérateur, puis tests
   « authenticated » : Carnet réel, ouverture de Fiche, popover d'écriture
   états complets, déconnexion.
10. **Extension MV3** — Playwright en mode `headed` avec
    `--load-extension` ; couvre A1-A8 sans intervention humaine après
    chargement initial. Demande un display X (xvfb ou DISPLAY=:0 local).
11. **Régression visuelle ciblée** (Playwright `toHaveScreenshot`) sur les
    écrans critiques (Fiche, popover d'écriture). Optionnel, à arbitrer.

---

## Commandes

```bash
npm test              # vitest run — unit + DOM (rapide, ~300 ms)
npm run test:watch    # vitest --watch — mode dev
npm run test:ui       # vitest --ui — interface web interactive
npm run test:coverage # vitest run --coverage — rapport couverture
npm run test:e2e      # playwright test — E2E (a besoin de dev:pwa, démarre seul si absent)
npm run test:e2e:ui   # playwright test --ui — mode interactif (codegen, traces)
npm run test:e2e:report  # playwright show-report — ouvre le dernier rapport HTML
npm run test:all      # tout enchaîné
```

---

## Critère de sortie V0.2 (révisé en #6)

V0.2 est considérée éprouvée quand :

1. **Unit + DOM** : couverture des modules `core/` et `ui/` qui sont à la
   portée d'un test sans navigateur (orchestrator inclus). Cible :
   100 % des branches de `contact-status`, `vcard-reader`, `geopoint`,
   `contact` (déjà ok), `geocoder`, `vcard-writer`, `contacts-sync`,
   `orchestrator`, `carnet`. Pas une cible sur `core/crypto.js` (WebCrypto
   du navigateur) ni sur `platform-extension.js` / `platform-pwa.js`
   (couplé Chrome / OAuth).
2. **E2E PWA non authentifié** : boot, navigation onglets, popovers d'en-
   tête, fermeture par Échap / clic hors / croix, focus trap, manifeste.
3. **E2E PWA authentifié** (via storageState) : ouverture Carnet, ouverture
   Fiche, popover d'écriture états (sans déclencher l'écriture réelle).
4. **CI verte** sur la dernière `main`, sans skip.

Le manuel résiduel — flow OAuth complet, écriture réelle dans Google,
extension MV3 chargée non empaquetée la première fois — reste documenté
dans TEST_V0.2.md et déroulé par l'opérateur avant la mise en magasin.

---

## Notes méta

- **Sandbox bash et localhost** : mon environnement d'exécution voit
  directement `http://localhost:3000`. Playwright tourne dans le sandbox et
  frappe le serveur que tu as lancé. Pas de tunnel, pas de proxy.
- **L9** (bac à sable ne persiste pas les processus) : conséquence,
  Playwright démarre lui-même `dev:pwa` via `webServer` si nécessaire — en
  local tu peux laisser ton serveur tourner, Playwright le détecte
  (`reuseExistingServer: true`).
- **Claude in Chrome** est appairé (#6). Sert pour les vérifs visuelles
  interactives que Playwright ne fait pas (jugements UX, exploration libre).
