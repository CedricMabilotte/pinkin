// e2e/pwa/i18n.spec.js
// ─────────────────────────────────────────────────────────────────────────────
// Test E2E — l'i18n du shell.js bascule selon navigator.language.
//
// PORTÉE. Lot 6 #7 a posé l'infra i18n et extrait les chaînes de shell.js
// vers i18n/fr.js. Ce test prouve que la mécanique de détection +
// fallback fonctionne dans un VRAI navigateur :
//   - locale en-US -> "Connect Google Contacts" (clé welcome.connect traduite
//     en en.js) ;
//   - locale es-ES -> "Conectar Google Contacts" (es.js) ;
//   - locale fr-FR (couverte par les autres specs) -> "Connecter Google Contacts".
//
// Les chaînes NON traduites en en.js (ex. header.sync.title) retombent sur
// fr — testé en unit (test/i18n.test.js), pas re-testé ici.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

test.describe('PWA — i18n (bascule selon navigator.language)', () => {
  test.use({ locale: 'en-US' });

  test('en-US -> bouton et accroche en anglais', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#btn-connect')).toHaveText(/Connect Google Contacts/i);
    await expect(page.locator('#state-auth p').first()).toHaveText(/loved ones/i);
  });
});

test.describe('PWA — i18n bascule espagnol', () => {
  test.use({ locale: 'es-ES' });

  test('es-ES -> bouton et accroche en espagnol', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#btn-connect')).toHaveText(/Conectar Google Contacts/i);
    await expect(page.locator('#state-auth p').first()).toHaveText(/seres queridos/i);
  });
});
