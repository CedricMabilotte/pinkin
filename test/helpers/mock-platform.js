// test/helpers/mock-platform.js
// ─────────────────────────────────────────────────────────────────────────────
// Mock « Platform en mémoire » — helper partagé de la couche unit/DOM.
//
// POURQUOI. `core/platform.js` s'appuie sur localStorage / chrome.storage,
// deux globals absents de l'environnement Node de Vitest. Trois fichiers de
// test (crypto, pkce-auth, contacts-sync) réimplémentaient chacun le même
// stockage en mémoire, sous des formes légèrement divergentes — source
// canonique unique désormais ici (extraction : revue tests 2026-07-17, voir
// TESTS_DURCISSEMENT.md).
//
// DEUX USAGES (voir test/README.md, section « Mocker Platform ») :
//
//   1. Injection par argument — pour les modules qui REÇOIVENT la plateforme
//      en paramètre (core/crypto.js) :
//
//        import { makeMemoryPlatform } from './helpers/mock-platform.js';
//        const platform = makeMemoryPlatform();
//        await encrypt('secret', platform);
//
//   2. Substitution de module — pour les modules qui IMPORTENT
//      core/platform.js directement (pkce-auth, contacts-sync). La factory
//      vi.mock est hissée en tête de fichier par Vitest : elle ne peut pas
//      référencer une variable du scope module, mais une factory ASYNC peut
//      importer ce helper :
//
//        vi.mock('../core/platform.js', async () => {
//          const { makeMemoryPlatform } = await import('./helpers/mock-platform.js');
//          return { Platform: makeMemoryPlatform() };
//        });
//        // puis, dans le test, l'import ordinaire livre le mock :
//        const { Platform } = await import('../core/platform.js');
//        Platform._store.clear();   // reset entre tests (beforeEach)
//
// `_store` (la Map interne) est exposé exprès : les tests s'en servent pour
// le reset entre cas et pour inspecter ce qui est réellement persisté
// (p. ex. vérifier qu'un jeton est chiffré AU REPOS, pas stocké en clair).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fabrique une Platform en mémoire, conforme au contrat get/set/del de
 * core/platform.js (set(key, null) supprime — même sémantique que le réel).
 */
export function makeMemoryPlatform() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async set(key, value) {
      if (value === null) store.delete(key);
      else store.set(key, value);
    },
    async del(key) { store.delete(key); },
    // Aligné sur le réel : l'auth est injectée par surface (main.js / popup.js).
    auth: null,
    // Accès direct au stockage pour les tests (reset + inspection au repos).
    _store: store,
  };
}
