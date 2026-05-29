// extension/background/secrets.example.js
// ─────────────────────────────────────────────────────────────────────────────
// MODÈLE versionné, à copier en `secrets.js` au premier checkout
// (`cp secrets.example.js secrets.js`) puis y mettre les vraies valeurs OAuth.
//
// `secrets.js` est gitignored — il ne doit JAMAIS être committé.
// `secrets.example.js` (ce fichier) est versionné — sert de modèle et de doc.
//
// Pourquoi ce fichier existe (S9-ter, voie γ).
// Avant : CLIENT_SECRET était hardcodé dans auth-worker.js, donc dans le code
// suivi git. Décision opérateur S9-ter : pour rendre le repo public (cohérence
// avec les claims « open source » de privacy.html / terms.html / landing /
// JUSTIFICATION_OAUTH), on sort le secret du code suivi. L'historique git
// d'avant ce refactor contient l'ancien secret — qui sera **révoqué** côté
// Google Cloud Console au moment du passage du repo en public (sinon GitHub
// Secret Scanning alerterait Google, qui le révoquerait automatiquement,
// cassant la prod).
//
// Le secret reste embarqué dans le binaire distribué (`.zip` CWS). C'est
// inévitable pour un client OAuth Google « Web » (PKCE n'élimine pas le secret
// côté Google). Voir JUSTIFICATION_OAUTH.md pour la justification honnête.
//
// CLIENT_ID est public par nature (visible sur l'écran de consentement Google)
// — il pourrait rester dans auth-worker.js, mais on le centralise ici par
// hygiène.
// ─────────────────────────────────────────────────────────────────────────────

export const CLIENT_ID     = 'YOUR_EXTENSION_CLIENT_ID.apps.googleusercontent.com';
export const CLIENT_SECRET = '<<REPLACE-WITH-EXTENSION-CLIENT-SECRET>>';
