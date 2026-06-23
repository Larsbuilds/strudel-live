#!/usr/bin/env node
/**
 * Analyze track: BPM, duration, basic metadata → manifest.json
 * npm run dj:analyze -- --track samples/soundcloud/foo.wav
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseFile } from 'music-metadata';
import MusicTempo from 'music-tempo';
import { loadManifest, upsertTrack, slugFromName } from '../server/manifest.mjs';

const args = process.argv.slice(2);
const trackArg = args[args.indexOf('--track') + 1] || args[0];

if (!trackArg) {
  console.log('Usage: npm run dj:analyze -- --track samples/soundcloud/track.wav');
  process.exit(1);
}

const trackPath = trackArg.startsWith('/') ? trackArg : join(process.cwd(), trackArg);
if (!existsSync(trackPath)) {
  console.error(`Not found: ${trackPath}`);
  process.exit(1);
}

const tmpWav = join(process.cwd(), '.tmp-analyze.wav');

console.log('Analyzing…', trackPath);

execSync(
  `ffmpeg -y -i "${trackPath}" -ac 1 -ar 44100 -f wav "${tmpWav}"`,
  { stdio: 'pipe' },
);

const buf = readFileSync(tmpWav);
const pcm = buf.slice(44);
const samples = new Float32Array(pcm.length / 2);
for (let i = 0; i < samples.length; i++) {
  samples[i] = pcm.readInt16LE(i * 2) / 32768;
}

const mt = new MusicTempo(samples);
const bpm = Math.round(mt.tempo) || 120;

let meta = {};
try {
  meta = await parseFile(trackPath);
} catch {
  /* optional */
}

unlinkSync(tmpWav);

const name = basename(trackPath).replace(/\.[^.]+$/, '');
const relFile = trackPath.includes('samples/')
  ? trackPath.split('samples/')[1]
  : `soundcloud/${basename(trackPath)}`;
const id = slugFromName(name);

const duration = meta.format?.duration ? Math.round(meta.format.duration) : null;
const title = meta.common?.title || name;

const track = upsertTrack(id, {
  id,
  name: title,
  file: relFile,
  bpm,
  key: null,
  duration,
  analyzedAt: new Date().toISOString(),
});

console.log('\n✓ Analysis complete');
console.log(JSON.stringify(track, null, 2));
console.log('\nOptional: npm run dj:stems -- --track', trackArg);
