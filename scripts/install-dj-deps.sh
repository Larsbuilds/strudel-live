#!/usr/bin/env bash
# DJ-Modus Dependencies (Mac)
set -euo pipefail

echo "=== DJ Dependencies ==="

if command -v ffmpeg >/dev/null 2>&1; then
  echo "✓ ffmpeg"
else
  echo "○ ffmpeg — brew install ffmpeg"
fi

if command -v yt-dlp >/dev/null 2>&1; then
  echo "✓ yt-dlp (global)"
else
  echo "→ yt-dlp via npx (kein Install nötig)"
fi

if command -v demucs >/dev/null 2>&1; then
  echo "✓ demucs"
else
  echo "○ demucs optional — pip install demucs"
fi

if command -v python3 >/dev/null 2>&1; then
  echo "✓ python3"
fi

echo ""
echo "SoundCloud fetch: npm run sc:fetch -- --url \"https://soundcloud.com/...\""
echo "Stem separation:  pip install demucs && npm run dj:stems -- --track ..."
