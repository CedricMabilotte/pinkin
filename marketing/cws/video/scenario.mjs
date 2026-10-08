// Scénario enregistré de la démo OAuth Pinkin (PWA, compte de test, contacts fictifs).
import { chromium } from '/home/ced/Documents/Claude/Projects/pinkin/node_modules/@playwright/test/index.mjs';
import { appendFileSync, writeFileSync } from 'node:fs';
const CAP = '/home/ced/.local/pinkin-tools/video/captions.jsonl';
const cap = (text, opts = {}) => appendFileSync(CAP, JSON.stringify({ t: Date.now() / 1000, text, ...opts }) + '\n');
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = b.contexts()[0];
await ctx.route(/accounts\.google\.com\/o\/oauth2\/v2\/auth/, r => { const u = new URL(r.request().url()); if (!u.searchParams.has('hl')) u.searchParams.set('hl', 'en'); r.continue({ url: u.toString() }); });
for (const p of ctx.pages()) if (!p.url().includes('pinkin.org')) await p.close();
const page = ctx.pages()[0];
const mode = process.argv[2];

if (mode === 'prep') {          // hors enregistrement : déconnexion propre
  await page.bringToFront(); await page.goto('https://pinkin.org/pwa/'); await wait(4000);
  if (await page.locator('#btn-logout').isEnabled().catch(() => false)) { await page.click('#btn-logout'); await wait(600); await page.click('#btn-logout-confirm'); await wait(3000); }
  await page.goto('https://pinkin.org/pwa/'); await wait(3000);
  console.log('prep', await page.innerText('body').then(t => t.replace(/\n+/g, ' | ').slice(0, 200)));
  process.exit(0);
}

writeFileSync(CAP, '');
cap('Pinkin — pinkin.org. A web app (and Chrome extension) that shows your Google Contacts as pins on an OpenStreetMap. Demo with a Google test account and fictitious contacts.');
await wait(7000);
await page.click('text=EN').catch(() => {}); await wait(1500);
cap('Step 1 — The user clicks "Connect Google Contacts". Pinkin starts a standard OAuth 2.0 authorization code flow with PKCE.');
await wait(5000);
await page.click('text=Connect Google Contacts');
await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 }); await wait(2500);
cap('Google sign-in page. The address bar shows the OAuth client ID of Pinkin: client_id=915913862394-h2oldnp0ss4skevi0jo1d8qjtr2m2qkl.apps.googleusercontent.com', { zoomUrl: true });
await wait(8000);
await page.click('text=thelittlefrenchy2010@gmail.com');
await page.waitForURL(/warning|consent/, { timeout: 30000 }); await wait(2000);
if (page.url().includes('warning')) {
  cap('The app is still in testing, so Google shows its "unverified app" notice to test users. The user continues.');
  await wait(6000);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/consent/, { timeout: 30000 }); await wait(2000);
}
cap('Consent screen #1: Pinkin requests ONLY read access — scope contacts.readonly ("See and download your contacts").', { zoomUrl: true });
await wait(8000);
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL(/pinkin\.org/, { timeout: 30000 }); await wait(4000);
cap('Pinkin reads names, addresses, phone numbers and emails through the People API, geocodes the addresses with OpenStreetMap Nominatim, and places a pin per contact. Data stays in the browser.');
await page.waitForFunction(() => document.querySelectorAll('.pin-marker').length >= 23, null, { timeout: 240000 }); await wait(2000);
cap('Once every address is located, a sync refreshes the view: one pin per contact, all from the user\'s own Google address book.');
await page.click('text=Sync'); await wait(9000);
cap('Clicking a pin opens the contact card: email, call, SMS, WhatsApp or Signal, using the data read with contacts.readonly.');
const idx = await page.$$eval('.pin-marker', es => { let k = 0, best = 1e9; es.forEach((e, i) => { const m = /translate3d\((-?[\d.]+)px/.exec(e.style.transform); const x = m ? +m[1] : 1e9; if (x < best) { best = x; k = i; } }); return k; });
const pin = page.locator('.pin-marker').nth(idx);
await pin.hover(); await wait(1500); await pin.click(); await wait(8000);
await page.keyboard.press('Escape'); await wait(1000);
await page.click('#panel-close').catch(() => {}); await wait(1000);
cap('The List tab keeps contacts without a postal address reachable.');
await page.click('text=List'); await wait(6000);
await page.click('text=Map'); await wait(2000);
cap('Step 2 — Writing is opt-in. The user clicks "Write" and explicitly allows write access.');
await page.click('#btn-write'); await wait(4000);
const allow = page.locator('#write-pop-actions button').first();
cap('Step 2 — Writing is opt-in. The user clicks "Write" and explicitly allows write access: ' + (await allow.innerText()).trim());
await wait(4000);
await allow.click();
await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 }); await wait(2500);
cap('Incremental authorization: only now does Pinkin request the second scope, "contacts" (include_granted_scopes=true).', { zoomUrl: true });
await wait(6000);
if (await page.getByText('thelittlefrenchy2010@gmail.com').first().isVisible().catch(() => false) && /accountchooser|chooser/.test(page.url())) {
  await page.click('text=thelittlefrenchy2010@gmail.com'); await page.waitForURL(/warning|consent/, { timeout: 30000 }); await wait(2000);
}
if (page.url().includes('warning')) { await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForURL(/consent/, { timeout: 30000 }); await wait(2000); }
const cbs = page.locator('input[type=checkbox]');
const n = await cbs.count();
cap('Consent screen #2: write access to Google Contacts ("See, edit, download, and permanently delete your contacts") — the narrowest scope Google offers for writing.', { zoomUrl: true });
await wait(5000);
for (let i = 0; i < n; i++) { if (!(await cbs.nth(i).isChecked())) { await cbs.nth(i).check(); await wait(800); } }
await wait(3000);
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForURL(/pinkin\.org/, { timeout: 30000 }); await wait(3000);
cap('Pinkin uses write access for one thing only: it saves each geocoded position into the contact\'s standard GEO field ("geo:lat,lon", RFC 6350). No other field is modified.');
await page.waitForFunction(() => /saved|enregistr/i.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {}); await wait(8000);
const g = await ctx.newPage(); await g.goto('https://contacts.google.com/?hl=en'); await wait(4000);
await g.getByText('Camille Moreau').first().click(); await wait(3000); await g.getByText(/geo:/).first().scrollIntoViewIfNeeded().catch(() => {}); await wait(1500);
cap('Result in Google Contacts: the contact now carries a "GEO" custom field, so the next opening is instant. The address can also be corrected from the card.');
await wait(9000);
await g.close(); await page.bringToFront(); await wait(1500);
cap('Signing out revokes the token. No server, no tracker. Privacy policy: https://pinkin.org/privacy — Terms: https://pinkin.org/terms');
await page.click('#btn-logout'); await wait(1500); await page.click('#btn-logout-confirm'); await wait(6000);
cap('');
console.log('done');
process.exit(0);
