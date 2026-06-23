import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, base)));
    } else if (entry.name.endsWith('.strudel')) {
      files.push(full.slice(base.length + 1));
    }
  }
  return files;
}

const patternsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'patterns');
const files = (await walk(patternsDir)).sort();

console.log('Patterns in patterns/:\n');
for (const file of files) {
  console.log(`  - ${file}`);
}
