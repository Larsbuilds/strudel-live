import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const patternsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'patterns');
const files = (await readdir(patternsDir)).filter((f) => f.endsWith('.strudel')).sort();

console.log('Patterns in patterns/:\n');
for (const file of files) {
  console.log(`  - ${file}`);
}
