import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS_DIR = join(process.cwd(), 'patterns');

function walk(dir, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full, base));
    else if (e.name.endsWith('.strudel')) files.push(full);
  }
  return files;
}

export function loadAllPatterns() {
  if (!existsSync(PATTERNS_DIR)) return {};
  const files = walk(PATTERNS_DIR);
  const patterns = {};
  for (const file of files) {
    const rel = file.slice(PATTERNS_DIR.length + 1).replace(/\.strudel$/, '');
    patterns[rel] = readFileSync(file, 'utf8');
  }
  return patterns;
}

export function listPatternNames() {
  return Object.keys(loadAllPatterns()).sort();
}
