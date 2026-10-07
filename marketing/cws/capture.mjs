import { chromium } from '/home/ced/Documents/Claude/Projects/pinkin/node_modules/@playwright/test/index.mjs';
import { connections } from './contacts.mjs';
const BASE = 'http://localhost:3011';
const [lang='fr', out='probe.png', scope='readonly', mode='map'] = process.argv.slice(2);
const browser = await chromium.launch({executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'});
const ctx = await browser.newContext({ viewport:{width:1280,height:800}, locale: lang==='en'?'en-US':lang==='es'?'es-ES':'fr-FR', deviceScaleFactor:1 });
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text()); });
await page.addInitScript(() => { sessionStorage.setItem('pkce_state','s'); sessionStorage.setItem('pkce_verifier','v'); });
await page.route('**/api/oauth-config', r => r.fulfill({json:{clientId:'demo.apps.googleusercontent.com',clientSecret:'demo'}}));
const scopes = scope==='write' ? 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts' : 'https://www.googleapis.com/auth/contacts.readonly';
await page.route('**/oauth2.googleapis.com/**', r => r.fulfill({json:{access_token:'demo-token',expires_in:3600,refresh_token:'demo-refresh',scope:scopes,token_type:'Bearer'}}));
await page.route('**/people.googleapis.com/**', r => {
  const u = r.request().url();
  if (u.includes('/people/me/connections')) return r.fulfill({json:{connections:connections(),totalPeople:26}});
  if (u.includes('/people/me?')) return r.fulfill({json:{resourceName:'people/me',emailAddresses:[{value:'demo@example.org'}]}});
  return r.fulfill({json:{}});
});
await page.route('**/nominatim.openstreetmap.org/**', r => r.fulfill({json:[]}));
await page.goto(BASE + '/?code=demo&state=s');
await page.waitForSelector('.pin-marker', {timeout: 20000});
await page.waitForTimeout(3500); // tuiles
const pin = async (txt) => { await page.locator('.pin-marker', {hasText: txt}).first().click(); await page.waitForTimeout(1200); };
if (mode==='fiche') await pin('CM');
if (mode==='fiche-es') await pin('SN');
if (mode==='carnet') { await page.click('#tab-carnet'); await page.waitForTimeout(600);  }
if (mode==='write') { await page.click('#btn-write'); await page.waitForTimeout(900); }
await page.mouse.move(1279, 799);
await page.screenshot({ path: out });
console.log('ok', mode, out);
await browser.close();
