#!/usr/bin/env node
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getHealth } from '../server/health.mjs';
import { listPatternNames } from '../server/patterns-list.mjs';

config();

const checks = [];
const ok = (m) => checks.push({ ok: true, msg: m });
const warn = (m) => checks.push({ ok: false, msg: m });

const nodeMajor = Number(process.version.slice(1).split('.')[0]);
nodeMajor >= 18 ? ok(`Node.js ${process.version}`) : warn(`Node.js ${process.version} — 18+ empfohlen`);

existsSync('.env') ? ok('.env vorhanden') : warn('.env fehlt — npm run setup');

const env = process.env;
const health = getHealth(env);

env.OPENAI_API_KEY ? ok('OPENAI_API_KEY (KI + Whisper)') : warn('OPENAI_API_KEY fehlt');
env.ANTHROPIC_API_KEY ? ok('ANTHROPIC_API_KEY') : warn('ANTHROPIC_API_KEY optional');
const ollamaOn = env.AI_PROVIDER === 'ollama' || env.USE_OLLAMA === 'true';
if (ollamaOn) {
  const { checkOllama } = await import('../server/ollama.mjs');
  const o = await checkOllama(env);
  o.ok && o.hasModel
    ? ok(`Ollama (${env.OLLAMA_MODEL || 'strudel-live'})`)
    : warn(`Ollama — ${o.error || 'Modell fehlt, npm run ollama:setup'}`);
}

existsSync('node_modules') ? ok('node_modules') : warn('npm install');
listPatternNames().length > 0 ? ok(`${listPatternNames().length} Patterns`) : warn('Keine Patterns');

health.tools.ffmpeg ? ok('ffmpeg') : warn('ffmpeg fehlt — brew install ffmpeg');
health.tools.demucs ? ok('demucs (Stems)') : warn('demucs optional — pip install demucs');
health.tools.sclang ? ok('SuperCollider sclang') : warn('sclang optional — für SynthDefs');

console.log('\nstrudel-live Setup-Check\n');
for (const c of checks) console.log(`${c.ok ? '✓' : '○'} ${c.msg}`);

const ready = Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || ollamaOn);
console.log(ready ? '\n→ npm run dev:full  dann  npm run workflow:check\n' : '\n→ npm run setup  oder  npm run ollama:setup\n');
process.exit(ready ? 0 : 1);
