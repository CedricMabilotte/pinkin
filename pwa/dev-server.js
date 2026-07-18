// pwa/dev-server.js
// ─────────────────────────────────────────────────────────────────────────────
// Serveur de développement local pour la PWA Pinkin.
//
// POURQUOI UN SERVEUR DÉDIÉ. La PWA suppose être servie depuis la RACINE d'un
// domaine : index.html et ses modules emploient des chemins absolus (/pwa/...,
// /core/..., /ui/..., /lib/..., /assets/...), et l'URI de retour OAuth est
// /auth/callback. Un serveur de fichiers ordinaire ne suffit donc pas — il faut
// TROIS règles de routage :
//   - « / »              -> pwa/index.html  (confort de dev, racine du dépôt) ;
//   - « /pwa/ » et « /pwa » -> pwa/index.html  (le VRAI point d'entrée prod —
//                           `start_url` du manifest et scope d'enregistrement
//                           du service worker sont tous deux `/pwa/` ; sans
//                           cette règle le chemin qui reflète fidèlement la
//                           prod renvoyait une 404 en dev, cf. AUDIT_DURCISSEMENT.md
//                           / échec initial de e2e/pwa/offline.spec.js) ;
//   - « /auth/callback »  -> pwa/index.html  (page de retour du consentement
//                           Google ; sans cette règle, Google renverrait sur
//                           une 404 et le ?code= ne serait jamais traité).
// Tout autre chemin est servi tel quel depuis le dépôt.
//
// RÉPÉTITION DE LA PROD. Ce serveur préfigure la configuration d'hébergement de
// pinkin.org (mise en magasin / V1) : la règle « / et /auth/callback rendent
// index.html » devra s'y retrouver, sous une forme ou une autre (réécriture
// d'URL, fallback SPA…).
//
// USAGE.   node pwa/dev-server.js     (ou : npm run dev:pwa)
//          puis ouvrir http://localhost:3000
//
// PRÉ-REQUIS OAUTH. Le client OAuth « PWA » (Google Cloud) doit autoriser l'URI
// de redirection exacte : http://localhost:3000/auth/callback
// (Bascule depuis 8080 en session #7 suite — alignement avec l'URI déjà
// autorisée GCP + convention Next.js de l'écosystème Freechi parent.)
//
// Zéro dépendance — http/fs/path du cœur Node, comme le reste du projet.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, normalize, extname } from 'node:path';

const PORT = Number(process.env.PORT) || 3000;

// Racine servie = racine du dépôt, soit le dossier PARENT de pwa/.
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// DURCISSEMENT (revue de durcissement — voir AUDIT_DURCISSEMENT.md). Ce
// serveur sert TOUT fichier lisible sous REPO_ROOT (seule protection avant
// ce correctif : la garde anti-traversée `../`). Deux conséquences non
// souhaitées en l'état : (1) `server.listen(PORT)` sans hôte explicite bind
// sur toutes les interfaces réseau, joignable depuis l'extérieur si la
// machine de dev est sur un réseau partagé ou derrière un tunnel ; (2)
// `GET /extension/background/secrets.js` ou `GET /.git/config` seraient
// servis tels quels, exposant le CLIENT_SECRET OAuth local et l'historique
// git complet. Les deux sont corrigés ci-dessous ; ce serveur reste dev-only
// (jamais dans le chemin de déploiement Cloudflare, cf. HEBERGEUR_PWA.md).
// 'localhost' (pas '127.0.0.1' en dur) : c'est l'hôte déjà utilisé par
// PWA_BASE_URL dans playwright.config.js et par l'URI de redirection OAuth
// autorisée côté Google — on garde la même résolution DNS des deux côtés
// plutôt que de risquer un mismatch IPv4/IPv6 avec les clients de test/CI.
const DEV_HOST = process.env.HOST || 'localhost';

// Préfixes de chemin jamais servis, même sous la racine du dépôt.
const DENYLIST_PREFIXES = [
  '/.git/',
  '/.git',
  '/node_modules/',
  '/extension/background/secrets.js',
  '/extension/background/secrets.example.js',
  '/.env',
  '/scripts/',
];

function isDenied(pathname) {
  return DENYLIST_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix));
}

// Page unique de la PWA — rendue à la fois sur « / » et « /auth/callback ».
const INDEX = join(REPO_ROOT, 'pwa', 'index.html');

// Types MIME. Le .js DOIT être servi en text/javascript : un module ES refusé
// par le navigateur sinon. .webmanifest et .vcf explicités pour la même raison.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.map':  'application/json; charset=utf-8',
  '.vcf':  'text/vcard; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

// Envoie un fichier du dépôt. `absPath` a déjà été validé comme étant à
// l'intérieur de REPO_ROOT (cf. garde anti-traversée dans le handler).
async function sendFile(res, absPath) {
  const body = await readFile(absPath);
  res.writeHead(200, {
    'Content-Type': MIME[extname(absPath).toLowerCase()] || 'application/octet-stream',
    // Pas de cache en dev : on veut toujours le fichier que l'on vient d'éditer.
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function send404(res, what) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 — introuvable : ${what}\n`);
}

const server = createServer(async (req, res) => {
  // On ne lit que le chemin ; la query (?code=…&state=…) est ignorée côté
  // serveur — c'est le JavaScript de la page qui l'exploite.
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch {
    return send404(res, req.url);
  }

  // Les routes qui rendent la PWA elle-même : racine (confort dev), point
  // d'entrée prod réel (/pwa/, /pwa — scope du service worker), et retour OAuth.
  if (pathname === '/' || pathname === '/pwa/' || pathname === '/pwa' || pathname === '/auth/callback') {
    try {
      await sendFile(res, INDEX);
    } catch {
      send404(res, 'pwa/index.html');
    }
    console.log(`200  ${pathname}  -> pwa/index.html`);
    return;
  }

  // Liste noire — avant toute résolution de chemin : secrets, .git, tooling.
  if (isDenied(pathname)) {
    console.log(`403  ${pathname}  (liste noire)`);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 — interdit\n');
  }

  // Tout le reste : un fichier du dépôt. Garde anti-traversée de répertoire —
  // le chemin résolu doit rester SOUS la racine du dépôt, jamais au-dessus.
  const absPath = normalize(join(REPO_ROOT, pathname));
  if (!absPath.startsWith(REPO_ROOT)) {
    return send404(res, pathname);
  }

  try {
    const info = await stat(absPath);
    if (!info.isFile()) throw new Error('pas un fichier');
    await sendFile(res, absPath);
    console.log(`200  ${pathname}`);
  } catch {
    send404(res, pathname);
    console.log(`404  ${pathname}`);
  }
});

server.listen(PORT, DEV_HOST, () => {
  console.log(`Pinkin — serveur de dev PWA`);
  console.log(`  racine servie : ${REPO_ROOT}`);
  console.log(`  écoute        : http://${DEV_HOST}:${PORT} (HOST env var pour changer)`);
  console.log(`  ouvrir        : http://localhost:${PORT}`);
  console.log(`  arrêter       : Ctrl+C`);
});
