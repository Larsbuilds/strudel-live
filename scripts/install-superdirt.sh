#!/usr/bin/env bash
# Hilft beim SuperCollider/SuperDirt Setup auf dem Mac.
set -euo pipefail

echo "=== SuperDirt / SuperCollider Setup (Mac) ==="
echo ""

if command -v scsynth >/dev/null 2>&1; then
  echo "✓ scsynth gefunden: $(which scsynth)"
else
  echo "○ SuperCollider nicht gefunden"
  echo "  Install: brew install --cask supercollider"
  echo "  Oder: https://supercollider.github.io/download"
fi

if command -v sclang >/dev/null 2>&1; then
  echo "✓ sclang gefunden"
else
  echo "○ sclang nicht im PATH"
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "✓ pnpm gefunden"
else
  echo "○ pnpm fehlt — npm install -g pnpm"
fi

echo ""
echo "Nächste Schritte:"
echo "  1. SuperCollider öffnen, SuperDirt installieren (siehe Tidal Docs)"
echo "  2. git clone https://codeberg.org/uzu/strudel.git ~/strudel-upstream"
echo "  3. cd ~/strudel-upstream && pnpm i && pnpm run osc"
echo "  4. In strudel-live: Pattern 05-superdirt-osc oder .osc() nutzen"
echo ""
echo "Details: docs/SUPERCOLLIDER.md"
