# Convention de tests — pinkin

Guide pour écrire ou modifier un test dans ce dépôt. À lire avant d'ajouter
un fichier de test ; les décisions déjà arbitrées (dernière section) ne se
« corrigent » pas sans passer par l'opérateur.

## Les trois couches

| Couche | Runner | Environnement | Où | Lance avec |
|---|---|---|---|---|
| unit | Vitest | Node pur | `test/*.test.js` | `npm test` |
| dom | Vitest | happy-dom | `test/dom/*.test.js` | `npm test` |
| e2e | Playwright | Chrome/Chromium réel | `e2e/**/*.spec.js` | `npm run test:e2e` |

**Quand utiliser laquelle :**

- **unit** — logique pure et services : modèles (`core/model/`), parsing,
  seuils, appels API mockés (`core/api/`, `core/auth/`, `core/services/`).
  C'est la couche par défaut : rapide (~1,2 s pour toute la suite),
  vérifiable à chaque modification, y compris depuis un sandbox contraint.
- **dom** — modules UI qui manipulent `document`/`window` sans exiger un vrai
  navigateur (rendu du Carnet, etc.). happy-dom suffit pour créer des nœuds,
  cliquer, lire des classes ; il ne suffit PAS pour du layout, du focus réel
  ou des Web APIs exotiques — dans ce cas, monter d'une couche.
- **e2e** — parcours réels dans un navigateur : boot de la PWA, i18n par
  `navigator.language`, retour OAuth, focus trap. Trois projects Playwright
  (voir `playwright.config.js`, largement commenté) :
  - `pwa-headless` — la PWA sans auth ; tourne partout, c'est la couche E2E
    « de tous les jours » (14 tests, ~30 s).
  - `pwa-authenticated` — la PWA après OAuth Google réel. Requiert un profil
    persistant capturé une fois par l'opérateur : `npm run oauth:capture`
    (recapture : `rm -rf e2e/.auth/profile && npm run oauth:capture`).
    Auto-skip si le profil est absent. Un seul fichier spec, un seul worker
    (contrainte `launchPersistentContext`) ; le profil est PARTAGÉ entre
    tests — ne jamais cliquer un bouton qui révoque le token.
  - `extension` — extension MV3 chargée non empaquetée. Désactivé par défaut
    (sentinel auto-skip) ; activation : `PINKIN_EXT=1 npx playwright test
    --project extension`. Ne tourne PAS en sandbox Cowork (timeout
    systématique sur `waitForEvent('serviceworker')`, cf. `lecons-pinkin.md`
    L12) — à reproduire sur machine opérateur uniquement.

La segmentation unit/dom est faite par la clé `projects` de
`vitest.config.js` (deux environnements, un seul `npm test`). Un fichier créé
dans `test/dom/` hérite automatiquement de happy-dom ; partout ailleurs sous
`test/`, c'est Node.

## Mocker `Platform`

`core/platform.js` s'appuie sur `localStorage`/`chrome.storage`, absents de
Node. Le mock mémoire canonique vit dans **`test/helpers/mock-platform.js`**
(ne pas réécrire un mock local — cinq fichiers le dupliquaient avant
extraction). Deux usages :

1. **Injection par argument** — quand le module sous test reçoit la
   plateforme en paramètre (ex. `core/crypto.js`) :

   ```js
   import { makeMemoryPlatform } from './helpers/mock-platform.js';
   const platform = makeMemoryPlatform();
   await encrypt('secret', platform);
   ```

2. **Substitution de module** — quand le module importe `core/platform.js`
   directement. La factory `vi.mock` est hissée en tête de fichier, donc elle
   ne peut pas capturer une variable du scope ; on passe par une factory
   async :

   ```js
   vi.mock('../core/platform.js', async () => {
     const { makeMemoryPlatform } = await import('./helpers/mock-platform.js');
     return { Platform: makeMemoryPlatform() };
   });
   const { Platform } = await import('../core/platform.js'); // livre le mock
   ```

   Reset entre tests : `beforeEach(() => Platform._store.clear())`.
   `_store` (la Map interne) sert aussi à inspecter ce qui est réellement
   persisté — p. ex. vérifier qu'un jeton est chiffré AU REPOS.
   Besoin d'une auth stubée ? La poser après fabrication :
   `Platform.auth = { async getAccessToken() { return 'fake-token'; } }`
   (voir `test/vcard-writer.test.js`).

## Mocker `fetch`

Helper canonique : **`test/helpers/mock-fetch.js`**.

```js
import { jsonResponse, mockFetchOnce } from './helpers/mock-fetch.js';

// Réponse unique répétée :
const fn = mockFetchOnce(jsonResponse({ access_token: 'AT' }));

// Erreur HTTP :
mockFetchOnce(jsonResponse({ error: 'invalid_grant' }, { ok: false, status: 400 }));

// Séquence (read puis write, retry etag…) : vi.fn() en chaîne, puis stub :
const fn = vi.fn()
  .mockResolvedValueOnce(jsonResponse({ etag: 'E1' }))
  .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 400 }));
vi.stubGlobal('fetch', fn);
```

Règles :
- **Toujours** `afterEach(() => { vi.unstubAllGlobals(); })` dans un fichier
  qui stubbe `fetch`.
- `jsonResponse` n'expose que `ok/status/json()/text()` — volontaire : si le
  code de prod se met à lire autre chose, on étend le contrat DANS le helper.
- Aucun test unit/dom ne doit toucher le réseau réel. En E2E, on intercepte
  avec `page.route(...)` (voir `e2e/pwa/oauth-callback.spec.js`, qui sert
  aussi une réponse factice à `/api/oauth-config` — endpoint qui n'existe
  qu'en prod côté Worker Cloudflare).

## Garde-fous transverses (ne pas retirer)

- `test/no-hardcoded-secrets.test.js` — scanne le code suivi pour le préfixe
  `GOCSPX-` (secret Google). Protège la sortie des secrets faite en S9-ter.
- `npm run check:quotes` (`scripts/check-smart-quotes.mjs`, câblé en CI) —
  détecte les guillemets typographiques dans les délimiteurs de code
  (incident S10 : écran blanc en prod, cf. `lecons-pinkin.md` L19).
- `test/i18n.test.js` — parité des clés FR/EN/ES + préservation des
  placeholders.

## Décisions déjà arbitrées — ne pas « corriger »

- **L'E2E ne tourne PAS sur chaque push CI.** `.github/workflows/tests.yml`
  ne lance Playwright qu'en `workflow_dispatch` manuel. Ce n'est pas un
  oubli : flakiness constatée et documentée sur les runners GitHub mutualisés
  (`lecons-pinkin.md` L11/L12) ; le job `unit` (Vitest + check:quotes), lui,
  tourne à chaque push. Rebrancher l'E2E auto re-casserait un compromis
  arbitré par l'opérateur.
- **`workers: 2` hors CI** dans `playwright.config.js` : le dev-server
  mono-threadé sature au-delà (L11). Ne pas remonter à 4.
- **Le secret OAuth de la PWA vit côté Worker Cloudflare**
  (`/api/oauth-config`), pas dans le code ni dans le dev-server. Les tests le
  mockent ; le fallback dev-local est une décision d'architecture qui
  appartient à l'opérateur (`TAF.md`, `AUDIT_DURCISSEMENT.md` §5).
- **Couverture** : `npm run test:coverage` requiert `@vitest/coverage-v8`
  (non installé par défaut — `npm install --no-save @vitest/coverage-v8`).
  `core/platform.js` (adaptateur d'environnement) et les gros modules UI
  (`ui/orchestrator.js`, `ui/shell.js`, `ui/contact-panel.js`) sont couverts
  par l'E2E, pas par la couche unit — les instrumenter en unit passerait par
  le refactor listé en punch-list (`AUDIT_DURCISSEMENT.md` §6, item 6).
