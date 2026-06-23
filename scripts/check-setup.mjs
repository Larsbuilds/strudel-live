#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { config } from 'dotenv';

config();

const checks = [];

function ok(msg) {
  checks.push({ ok: true, msg });
}
function warn(msg) {
  checks.push({ ok: false, msg });
}

const nodeMajor = Number(process.version.slice(1).split('.')[0]);
nodeMajor >= 18 ? ok(`Node.js ${process.version}`) : warn(`Node.js ${process.version} — 18+ empfohlen`);

existsSync('.env') ? ok('.env vorhanden') : warn('.env fehlt — npm run setup');

const openai = Boolean(process.env.OPENAI_API_KEY);
const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);
openai ? ok('OPENAI_API_KEY gesetzt (KI + Whisper)') : warn('OPENAI_API_KEY fehlt');
anthropic ? ok('ANTHROPIC_API_KEY gesetzt') : warn('ANTHROPIC_API_KEY fehlt (optional)');

existsSync('node_modules') ? ok('node_modules installiert') : warn('npm install ausführen');
existsSync('samples') ? ok('samples/ Ordner') : warn('samples/ fehlt');

console.log('\nstrudel-live Setup-Check\n');
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '○'} ${c.msg}`);
}

const ready = openai || anthropic;
console.log(ready ? '\n→ Bereit: npm run dev' : '\n→ npm run setup && API-Key eintragen\n');
process.exit(ready ? 0 : 1);
