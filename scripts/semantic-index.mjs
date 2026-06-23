#!/usr/bin/env node
/**
 * Warm embedding cache for intent examples + catalog docs.
 * npm run semantic:index
 */
import { loadIntentExamples } from '../server/semantic-retrieval.mjs';
import { loadStrudelFunctions } from '../server/catalog-loader.mjs';
import { embedText, checkEmbeddings, getEmbedModel } from '../server/embeddings.mjs';

const examples = loadIntentExamples();
const functions = Object.values(loadStrudelFunctions());
const embed = await checkEmbeddings();

if (!embed.ok) {
  console.error('✗ Ollama not reachable:', embed.error);
  process.exit(1);
}

if (!embed.hasModel) {
  console.log(`→ pulling ${getEmbedModel()}…`);
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('ollama', ['pull', getEmbedModel()], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

let count = 0;
for (const ex of examples) {
  for (const phrase of ex.phrases) {
    await embedText(phrase);
    count += 1;
  }
}

for (const fn of functions) {
  const doc = `${fn.signature} ${fn.description} ${(fn.keywords || []).join(' ')}`;
  await embedText(doc);
  count += 1;
}

console.log(`✓ Indexed ${count} vectors (${examples.length} intents + ${functions.length} catalog functions)`);
