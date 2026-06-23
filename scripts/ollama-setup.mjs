#!/usr/bin/env node
/**
 * Ollama einrichten für strudel-live (lokale KI ohne API-Key).
 * npm run ollama:setup
 * npm run ollama:setup -- --strudel-coder   # fine-tuned Strudel model (recommended)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOllama } from '../server/ollama.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEFILE = join(__dirname, 'ollama-strudel.Modelfile');
const SYNTAX_MODEFILE = join(__dirname, 'ollama-strudel-coder.Modelfile');
const useStrudelCoder = process.argv.includes('--strudel-coder');

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

if (useStrudelCoder) {
  console.log('Dual-LLM setup: strudel-live (orchestrator) + strudel-coder (syntax)\n');
  run('ollama', ['pull', 'qwen2.5-coder:0.5b']);
  if (!existsSync(MODEFILE) || !existsSync(SYNTAX_MODEFILE)) {
    console.error('✗ Modelfile fehlt');
    process.exit(1);
  }
  run('ollama', ['create', 'strudel-live', '-f', MODEFILE]);
  run('ollama', ['create', 'strudel-coder', '-f', SYNTAX_MODEFILE]);
  console.log('\n✓ Dual-LLM bereit\n');
  console.log('In .env:');
  console.log('  AI_PROVIDER=ollama');
  console.log('  USE_OLLAMA=true');
  console.log('  OLLAMA_MODEL=strudel-live');
  console.log('  OLLAMA_SYNTAX_MODEL=strudel-coder');
  console.log('  OLLAMA_DUAL_LLM=true\n');
  console.log('Hinweis: strudel-coder nutzt Qwen-Base + Strudel-Prompt.');
  console.log('Fine-tune (amhinson/strudel-coder-0.5B) braucht GGUF-Import — siehe docs/LOCAL-AI.md\n');
} else {
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
    console.log('Dual-LLM (recommended): npm run ollama:setup -- --strudel-coder');
    console.log('  → orchestrator (tools) + Strudel Coder (syntax)\n');
    console.log('Dann: npm run dev:full\n');
  } else {
    console.warn('\n⚠ Ollama läuft, Modell-Check:', check);
  }
}
