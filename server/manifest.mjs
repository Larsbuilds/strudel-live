import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST_PATH = join(process.cwd(), 'samples', 'manifest.json');

export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { tracks: {} };
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

export function saveManifest(manifest) {
  mkdirSync(join(process.cwd(), 'samples'), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

export function upsertTrack(id, data) {
  const manifest = loadManifest();
  manifest.tracks[id] = {
    ...manifest.tracks[id],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveManifest(manifest);
  return manifest.tracks[id];
}

export function slugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'track';
}
