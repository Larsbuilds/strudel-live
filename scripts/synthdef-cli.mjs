#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { generateSynthDef } from '../server/synthdef.mjs';
import { sendSynthDefToSuperCollider } from '../server/sc-send.mjs';

config();

const args = process.argv.slice(2);
const prompt = args[args.indexOf('--prompt') + 1] || args[0];
const file = args[args.indexOf('--file') + 1];

async function main() {
  if (file) {
    const code = readFileSync(file, 'utf8');
    const result = sendSynthDefToSuperCollider(code);
    console.log(result.ok ? `✓ ${result.message}` : `✗ ${result.error}`);
    process.exit(result.ok ? 0 : 1);
  }

  if (!prompt) {
    console.log(`Usage:
  npm run synthdef -- --prompt "cyberpunk morphing bass"
  npm run osc:synthdef -- --file patterns/generated/synth.scd`);
    process.exit(1);
  }

  const { code, synthName, provider, model } = await generateSynthDef(prompt, process.env);
  console.log(`\n${provider}/${model} → ${synthName}\n`);
  console.log(code);
  const result = sendSynthDefToSuperCollider(code);
  if (result.ok) console.log(`\n✓ ${result.message}`);
  else console.log(`\n○ SC send: ${result.error}\n  Saved: ${result.file}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
