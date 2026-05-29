#!/usr/bin/env bash
# scripts/pack-extension.sh
# ─────────────────────────────────────────────────────────────────────────────
# Empaquetage reproductible de l'extension Chrome pour soumission au Chrome
# Web Store. Session #8 — recette V1.0.
#
# CE QUI EST INCLUS DANS LE ZIP (ce que charge Chrome) :
#   - manifest.json              (MV3, déjà avec key + icônes + permissions)
#   - extension/                 (background SW + popup + platform-extension.js)
#   - core/                      (auth, model, services, crypto)
#   - ui/                        (orchestrator, shell, carnet, map,
#                                 contact-panel, write-state)
#   - i18n/                      (index + fr + en + es)
#   - assets/icons/              (16/32/48/128 px)
#   - lib/leaflet/               (Leaflet bundlé local — MV3 interdit CDN)
#
# CE QUI EST EXCLU (sinon CWS rejette ou alourdit inutilement) :
#   - .git/, .github/            (historique versionnel)
#   - node_modules/              (volumineux, jamais chargé par Chrome)
#   - test/, e2e/                (tests automatisés — pas du code de prod)
#   - scripts/                   (outillage dev, pas du code de prod)
#   - playwright-report/, test-results/, coverage/
#   - pwa/                       (la PWA se déploie séparément, cf. HEBERGEUR_PWA.md)
#   - *.md (handoffs, briefs)    (docs internes)
#   - mockup-pinkin-*.html       (maquettes anciennes)
#   - playwright.config.js, vitest.config.js
#   - package.json, package-lock.json (utilisés par npm, pas par Chrome)
#
# CONTRÔLES PRÉ-EMPAQUETAGE :
#   1. arbre git propre (sinon on packerait des modifications non commitées)
#   2. manifest.json présent et valide (JSON parse)
#   3. version manifest != 0.* (V1 = 1.0.0+, sinon avertissement)
#   4. clé "key" présente dans manifest (sinon l'ID extension changerait)
#   5. 4 icônes présentes
#   6. CLIENT_ID extension renseigné (pas "TODO" ni vide)
#
# SORTIE : dist/pinkin-v<version>.zip
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
DIST="$ROOT/dist"

# ─── 1. Arbre git propre ────────────────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Arbre git non propre. Commit ou stash d'abord."
  git status --short
  exit 1
fi

# ─── 2-4. Manifeste : parse + version + key ─────────────────────────────────
if [ ! -f manifest.json ]; then
  echo "❌ manifest.json introuvable."
  exit 1
fi

# Parse JSON via Python (présent par défaut, évite jq comme dépendance externe).
VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
HAS_KEY=$(python3 -c "import json; print('yes' if 'key' in json.load(open('manifest.json')) else 'no')")

if [ "$HAS_KEY" != "yes" ]; then
  echo "❌ manifest.json : clé 'key' absente. L'ID extension changerait à la publication."
  exit 1
fi

case "$VERSION" in
  0.*) echo "⚠️  Version manifest $VERSION (< 1.0.0). Pour V1.0 release publique, bump à 1.0.0 d'abord." ;;
  *)   echo "✅ Version manifest : $VERSION" ;;
esac

# ─── 5. Icônes ──────────────────────────────────────────────────────────────
for size in 16 32 48 128; do
  if [ ! -f "assets/icons/icon${size}.png" ]; then
    echo "❌ assets/icons/icon${size}.png manquant."
    exit 1
  fi
done
echo "✅ Icônes 16/32/48/128 px présentes."

# ─── 6. secrets.js extension — présent et non placeholder ──────────────────
# Depuis S9-ter (voie γ — repo public), les CLIENT_ID/CLIENT_SECRET de
# l'extension vivent dans extension/background/secrets.js (gitignored). Il
# faut donc qu'il existe localement avant de packer, sinon le zip CWS ne
# contiendra pas le secret et l'extension ne pourra plus s'authentifier.
if [ ! -f extension/background/secrets.js ]; then
  echo "❌ extension/background/secrets.js absent."
  echo "   Crée-le à partir de extension/background/secrets.example.js et"
  echo "   renseigne les valeurs OAuth réelles (Google Cloud Console)."
  exit 1
fi
if grep -E '(YOUR_EXTENSION_CLIENT_ID|REPLACE-WITH-EXTENSION-CLIENT-SECRET)' \
        extension/background/secrets.js > /dev/null 2>&1; then
  echo "❌ extension/background/secrets.js contient encore des valeurs placeholder."
  echo "   Remplace YOUR_EXTENSION_CLIENT_ID et <<REPLACE-WITH-EXTENSION-CLIENT-SECRET>>"
  echo "   par les vraies valeurs avant de packer."
  exit 1
fi
echo "✅ secrets.js extension présent et non placeholder."

# ─── 7. Leaflet bundlé local ────────────────────────────────────────────────
if [ ! -f lib/leaflet/leaflet.js ] || [ ! -f lib/leaflet/leaflet.css ]; then
  echo "❌ lib/leaflet/ incomplet. Exécuter 'npm run install-leaflet' d'abord."
  exit 1
fi
echo "✅ Leaflet bundlé local présent."

# ─── 8. Construction du zip ─────────────────────────────────────────────────
mkdir -p "$DIST"
ZIP="$DIST/pinkin-v${VERSION}.zip"
rm -f "$ZIP"

# Liste blanche de ce qui rentre dans le zip — plus sûr qu'une liste noire.
# Si un nouveau dossier de prod apparaît, il faut l'ajouter ici explicitement
# (force la conscience de ce qui est livré).
zip -r "$ZIP" \
  manifest.json \
  extension/ \
  core/ \
  ui/ \
  i18n/ \
  assets/icons/ \
  lib/leaflet/ \
  -x "*.DS_Store" \
  -x "*/node_modules/*" \
  -x "*/test/*" \
  > /dev/null

echo ""
echo "✅ Empaquetage terminé."
echo "   Fichier : $ZIP"
echo "   Taille  : $(du -h "$ZIP" | cut -f1)"
echo ""
echo "Étapes suivantes :"
echo "  1. Vérifier le contenu : unzip -l $ZIP | head"
echo "  2. Chrome Web Store dashboard → New Item → upload du .zip"
echo "  3. Visibilité : Unlisted (non-listé) pour la mise en magasin initiale"
echo "  4. Soumettre pour revue"
