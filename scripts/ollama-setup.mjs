#!/usr/bin/env node
/**
 * Ollama einrichten für strudel-live (lokale KI ohne API-Key).
 * npm run ollama:setup
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOllama } from '../server/ollama.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEFILE = join(__dirname, 'ollama-strudel.Modelfile');

function run(cmd, args) {
  console.log(`→ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\n═══ Ollama Setup für strudel-live ═══\n');

if (spawnSync('which', ['ollama'], { encoding: 'utf8' }).status !== 0) {
  console.error('✗ Ollama nicht installiert → https://ollama.com/download');
  process.exit(1);
}

run('ollama', ['pull', 'qwen2.5-coder:0.5b']);

if (!existsSync(MODEFILE)) {
  console.error('✗ Modelfile fehlt:', MODEFILE);
  process.exit(1);
}

run('ollama', ['create', 'strudel-live', '-f', MODEFILE]);

const check = await checkOllama({ OLLAMA_MODEL: 'strudel-live' });
if (check.ok && check.hasModel) {
  console.log('\n✓ Modell strudel-live bereit\n');
  console.log('In .env eintragen:');
  console.log('  AI_PROVIDER=ollama');
  console.log('  USE_OLLAMA=true');
  console.log('  OLLAMA_MODEL=strudel-live\n');
  console.log('Dann: npm run dev:full\n');
} else {
  console.warn('\n⚠ Ollama läuft, Modell-Check:', check);
}
