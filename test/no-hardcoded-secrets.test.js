// test/no-hardcoded-secrets.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Garde-fou anti-régression — ajouté lors d'une revue de durcissement (voir
// AUDIT_DURCISSEMENT.md). Aucun test ne protégeait jusqu'ici le travail de
// session S9-ter (voie γ, cf. lecons-pinkin.md L18) qui a sorti les
// CLIENT_SECRET OAuth du code suivi pour permettre au repo de passer public :
// extension/background/secrets.js (gitignored) côté extension, env var
// Cloudflare lue par worker.js côté PWA. Rien n'empêchait qu'un futur commit
// réintroduise un secret en dur par erreur (copier-coller depuis Google Cloud
// Console dans le mauvais fichier, révert partiel, etc.).
//
// MOTIF. Les client secrets Google ont un préfixe stable et reconnaissable :
// `GOCSPX-`. Un placeholder de documentation (voir secrets.example.js) ne le
// contient jamais — zéro faux positif attendu.
//
// PORTÉE. On scanne les dossiers de code suivi par git qui participent au
// runtime (core/, ui/, extension/, pwa/, i18n/, scripts/) plus worker.js et
// wrangler.toml à la racine. On exclut explicitement :
//   - node_modules/ et .git/ (hors périmètre) ;
//   - extension/background/secrets.js — gitignored, contient LÉGITIMEMENT le
//     vrai secret en local (c'est son rôle) ;
//   - extension/background/secrets.example.js — modèle versionné, placeholder
//     volontairement non conforme au motif GOCSPX-.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const SCAN_DIRS = ['core', 'ui', 'extension', 'pwa', 'i18n', 'scripts'];

const EXCLUDE_FILES = new Set([
  join(REPO_ROOT, 'extension', 'background', 'secrets.js'),
  join(REPO_ROOT, 'extension', 'background', 'secrets.example.js'),
]);

const SCANNED_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.json']);

// Préfixe réel et stable des client secrets OAuth Google — un placeholder de
// doc ne le contient jamais, donc zéro faux positif attendu sur ce motif.
const SECRET_PATTERN = /GOCSPX-[A-Za-z0-9_-]+/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (SCANNED_EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

describe('anti-régression — secrets OAuth hors du code suivi', () => {
  test('aucun CLIENT_SECRET Google en dur dans core/ ui/ extension/ pwa/ i18n/ scripts/', () => {
    const offenders = [];
    for (const dir of SCAN_DIRS) {
      const full = join(REPO_ROOT, dir);
      if (!existsSync(full)) continue; // dossier absent -> rien à scanner ici
      for (const file of walk(full)) {
        if (EXCLUDE_FILES.has(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (SECRET_PATTERN.test(content)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('worker.js et wrangler.toml ne contiennent pas le secret PWA (lu via env var Cloudflare)', () => {
    for (const rel of ['worker.js', 'wrangler.toml']) {
      const path = join(REPO_ROOT, rel);
      if (!existsSync(path)) continue;
      const content = readFileSync(path, 'utf8');
      expect(SECRET_PATTERN.test(content)).toBe(false);
    }
  });

  test('secrets.example.js reste un placeholder (garde-fou inverse : détecte un oubli de "vraie" valeur)', () => {
    const path = join(REPO_ROOT, 'extension', 'background', 'secrets.example.js');
    if (!existsSync(path)) return;
    const content = readFileSync(path, 'utf8');
    expect(SECRET_PATTERN.test(content)).toBe(false);
  });
});
