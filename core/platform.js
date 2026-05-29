// core/platform.js
// Abstraction plateforme — interface unifiée pour stockage et auth
// Extension et PWA partagent cette interface, implémentations différentes
// Point d'extension : ajouter une plateforme = implémenter get/set/del + injecter auth

const isExtension = () =>
  typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';

export const Platform = {

  async get(key) {
    if (isExtension()) {
      return new Promise(resolve =>
        chrome.storage.local.get(key, data => resolve(data[key] ?? null))
      );
    }
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;   // donnée corrompue -> traitée comme une absence
    }
  },

  async set(key, value) {
    if (value === null) return this.del(key);
    if (isExtension()) {
      return new Promise(resolve =>
        chrome.storage.local.set({ [key]: value }, resolve)
      );
    }
    localStorage.setItem(key, JSON.stringify(value));
  },

  async del(key) {
    if (isExtension()) {
      return new Promise(resolve =>
        chrome.storage.local.remove(key, resolve)
      );
    }
    localStorage.removeItem(key);
  },

  // Injecté au démarrage par le point d'entrée de surface
  // (extension/popup/popup.js, pwa/app.js)
  // Freechi-specific : pas de modification nécessaire pour d'autres forks
  auth: null
};
