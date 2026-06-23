#!/usr/bin/env node
/**
 * Stem separation via Demucs (Python, optional).
 * npm run dj:stems -- --track samples/soundcloud/track.wav
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadManifest, upsertTrack, slugFromName } from '../server/manifest.mjs';

const args = process.argv.slice(2);
const trackArg = args[args.indexOf('--track') + 1] || args[0];

if (!trackArg) {
  console.log(`Usage: npm run dj:stems -- --track samples/soundcloud/track.wav

Requires: pip install demucs`);
  process.exit(1);
}

const trackPath = trackArg.startsWith('/') ? trackArg : join(process.cwd(), trackArg);
if (!existsSync(trackPath)) {
  console.error(`Not found: ${trackPath}`);
  process.exit(1);
}

const demucsCheck = spawnSync('demucs', ['--help'], { encoding: 'utf8' });
if (demucsCheck.error || demucsCheck.status === 127) {
  console.error('demucs not found. Run: pip install demucs');
  console.error('Or: npm run dj:deps');
  process.exit(1);
}

const outRoot = join(process.cwd(), 'samples', 'stems-work');
const stemDir = join(process.cwd(), 'samples', 'soundcloud');
mkdirSync(stemDir, { recursive: true });

const id = slugFromName(basename(trackPath).replace(/\.[^.]+$/, ''));
console.log('Running Demucs 4-stem (may take several minutes)…');

execSync(`demucs -n htdemucs -o "${outRoot}" "${trackPath}"`, {
  stdio: 'inherit',
});

const modelDir = join(outRoot, 'htdemucs', basename(trackPath).replace(/\.[^.]+$/, ''));
if (!existsSync(modelDir)) {
  console.error('Demucs output not found at', modelDir);
  process.exit(1);
}

const stemNames = [];
for (const file of readdirSync(modelDir)) {
  if (!file.endsWith('.wav')) continue;
  const stem = file.replace('.wav', '');
  const dest = join(stemDir, `${id}-${stem}.wav`);
  copyFileSync(join(modelDir, file), dest);
  stemNames.push(`${id}-${stem}`);
  console.log(`  → samples/soundcloud/${id}-${stem}.wav`);
}

upsertTrack(id, {
  id,
  file: `soundcloud/${basename(trackPath)}`,
  stems: stemNames.map((s) => `soundcloud/${s}`),
  stemsReady: true,
});

console.log(`\n✓ Stems ready for manifest id: ${id}`);
console.log('Use pattern 07-dj-stems in the app (update TRACK id)');
