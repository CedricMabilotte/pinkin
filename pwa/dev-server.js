// pwa/dev-server.js
// ─────────────────────────────────────────────────────────────────────────────
// Serveur de développement local pour la PWA Pinkin.
//
// POURQUOI UN SERVEUR DÉDIÉ. La PWA suppose être servie depuis la RACINE d'un
// domaine : index.html et ses modules emploient des chemins absolus (/pwa/...,
// /core/..., /ui/..., /lib/..., /assets/...), et l'URI de retour OAuth est
// /auth/callback. Un serveur de fichiers ordinaire ne suffit donc pas — il faut
// DEUX règles de routage :
//   - « / »              -> pwa/index.html  (la PWA vit à la racine) ;
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

  // Les deux routes qui rendent la PWA elle-même.
  if (pathname === '/' || pathname === '/auth/callback') {
    try {
      await sendFile(res, INDEX);
    } catch {
      send404(res, 'pwa/index.html');
    }
    console.log(`200  ${pathname}  -> pwa/index.html`);
    return;
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

server.listen(PORT, () => {
  console.log(`Pinkin — serveur de dev PWA`);
  console.log(`  racine servie : ${REPO_ROOT}`);
  console.log(`  ouvrir        : http://localhost:${PORT}`);
  console.log(`  arrêter       : Ctrl+C`);
});
