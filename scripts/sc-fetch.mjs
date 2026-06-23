#!/usr/bin/env node
/**
 * Fetch audio from SoundCloud or any URL supported by yt-dlp.
 * npm run sc:fetch -- --url "https://soundcloud.com/..."
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { upsertTrack, slugFromName } from '../server/manifest.mjs';

const args = process.argv.slice(2);
const url = args[args.indexOf('--url') + 1] || args[0];

if (!url?.startsWith('http')) {
  console.log(`Usage:
  npm run sc:fetch -- --url "https://soundcloud.com/artist/track"

Requires: yt-dlp (npm run dj:deps)`);
  process.exit(1);
}

const outDir = join(process.cwd(), 'samples', 'soundcloud');
mkdirSync(outDir, { recursive: true });

const outTemplate = join(outDir, '%(title).50s.%(ext)s');

console.log('Fetching via yt-dlp…');
try {
  execSync(
    `npx --yes yt-dlp -x --audio-format wav --audio-quality 0 -o "${outTemplate}" "${url}"`,
    { stdio: 'inherit' },
  );
} catch {
  console.error('\nFailed. Install yt-dlp: npm run dj:deps');
  process.exit(1);
}

const files = execSync(`ls -t "${outDir}"/*.wav 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
if (!files || !existsSync(files)) {
  console.error('Download finished but no WAV found.');
  process.exit(1);
}

const name = basename(files, '.wav');
const id = slugFromName(name);
const relFile = `soundcloud/${basename(files)}`;

upsertTrack(id, {
  id,
  name,
  url,
  file: relFile,
  source: 'soundcloud',
  stems: [],
  bpm: null,
  key: null,
});

console.log(`\n✓ Saved: samples/${relFile}`);
console.log(`  Manifest id: ${id}`);
console.log(`\nNext: npm run dj:analyze -- --track samples/${relFile}`);
