#!/usr/bin/env node
// scripts/check-smart-quotes.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Garde-fou anti-régression — durcissement suite à un incident réel S10 (voir
// lecons-pinkin.md L19). Un outil d'édition a un jour substitué des guillemets
// typographiques (U+2018 ' , U+2019 ' , U+201C " , U+201D ") aux guillemets
// droits utilisés comme délimiteurs de chaîne JS dans des appels t('...'). Le
// fichier reste syntaxiquement du JS valide sur le moment (les caractères
// deviennent du contenu de commentaire ou de chaîne adjacente), mais casse
// silencieusement le parsing plus loin — symptôme observé : écran blanc dans
// le navigateur natif, sans erreur exploitable en sandbox.
//
// CE SCRIPT NE REMPLACE PAS UN LINTER COMPLET : il vérifie une seule chose,
// vite et sans dépendance — qu'aucun fichier .js suivi ne contient l'un des
// quatre caractères typographiques ci-dessus. Zéro faux positif attendu : le
// code source Pinkin n'a aucune raison légitime de les contenir (le français
// affiché à l'utilisateur passe par i18n/{fr,en,es}.js, qui PEUT légitimement
// contenir des guillemets typographiques dans le TEXTE affiché — ce fichier
// est donc exclu du scan, volontairement).
//
// USAGE : node scripts/check-smart-quotes.mjs   (ou npm run check:quotes)
// Sortie non-zéro + liste des fichiers fautifs si un guillemet typographique
// est trouvé hors i18n/.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Dossiers de code JS suivi, hors i18n/ (contenu textuel, guillemets
// typographiques légitimes dans les CHAÎNES traduites) et hors tooling qui ne
// tourne jamais dans le navigateur (scripts/ lui-même, dont ce fichier).
const SCAN_DIRS = ['core', 'ui', 'extension', 'pwa'];

const SMART_QUOTES = /[‘’“”]/;

function walkJs(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walkJs(full, out);
    } else if (extname(entry) === '.js') {
      out.push(full);
    }
  }
  return out;
}

const offenders = [];
for (const dir of SCAN_DIRS) {
  const full = join(REPO_ROOT, dir);
  if (!existsSync(full)) continue;
  for (const file of walkJs(full)) {
    const content = readFileSync(file, 'utf8');
    if (SMART_QUOTES.test(content)) offenders.push(file);
  }
}

if (offenders.length > 0) {
  console.error('✗ Guillemets typographiques trouvés (U+2018/2019/201C/201D) dans :');
  for (const f of offenders) console.error(`  - ${f.replace(REPO_ROOT, '')}`);
  console.error('\nCe motif a déjà causé un écran blanc en prod (voir lecons-pinkin.md L19).');
  console.error('Remplacer par des guillemets droits \' ou des apostrophes échappées \\\'.');
  process.exit(1);
} else {
  console.log('✓ Aucun guillemet typographique dans core/ ui/ extension/ pwa/.');
}
