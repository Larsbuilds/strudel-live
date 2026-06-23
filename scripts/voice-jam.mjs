#!/usr/bin/env node
/**
 * CLI: Text oder Audio → Whisper → KI → Strudel-Pattern speichern
 *
 * npm run voice -- --prompt "harter techno beat"
 * npm run voice -- --audio recording.webm
 */
import { readFileSync, existsSync } from 'node:fs';
import { config } from 'dotenv';
import { generateStrudel } from '../server/generate.mjs';
import { transcribeAudio } from '../server/transcribe.mjs';
import { savePattern } from '../server/save-pattern.mjs';

config();

const env = process.env;
const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  let prompt = arg('--prompt') || arg('-p');
  const audioPath = arg('--audio') || arg('-a');

  if (audioPath) {
    if (!existsSync(audioPath)) {
      console.error(`Datei nicht gefunden: ${audioPath}`);
      process.exit(1);
    }
    const buffer = readFileSync(audioPath);
    const result = await transcribeAudio(
      { audioBase64: buffer.toString('base64'), mimeType: 'audio/webm' },
      env,
    );
    prompt = result.text;
    console.log(`Whisper: "${prompt}"`);
  }

  if (!prompt?.trim()) {
    console.log(`Usage:
  npm run voice -- --prompt "schneller trance beat"
  npm run voice -- --audio meine-aufnahme.webm`);
    process.exit(1);
  }

  const { code, provider, model, scale } = await generateStrudel(prompt, env);
  const saved = savePattern({ code, name: prompt });

  console.log(`\n✓ ${provider}/${model}`);
  if (scale) console.log(`  Tonart: ${scale.label}`);
  console.log(`  Gespeichert: ${saved.filepath}\n`);
  console.log(code);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
