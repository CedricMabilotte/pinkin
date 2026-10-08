// usage: node drive.mjs '<js body using page>'   — exécute un pas sur la page active du Chrome :99
import { chromium } from '/home/ced/Documents/Claude/Projects/pinkin/node_modules/@playwright/test/index.mjs';
const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx = b.contexts()[0];
let pages = ctx.pages().filter(p => !p.url().startsWith('devtools'));
let page = process.env.PG ? pages.find(p => p.url().includes(process.env.PG)) : pages[pages.length - 1];
const fn = new Function('page', 'ctx', `return (async () => { ${process.argv[2]} })()`);
try { const r = await fn(page, ctx); if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r)); }
catch (e) { console.log('ERR', e.message.split('\n')[0]); }
process.exit(0);
