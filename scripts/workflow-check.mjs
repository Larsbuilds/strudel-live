#!/usr/bin/env node
/**
 * Integration check — APIs, Dateien, Tools.
 * npm run workflow:check
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { getHealth } from '../server/health.mjs';
import { loadAllPatterns } from '../server/patterns-list.mjs';

config();

const PORT = process.env.PORT || 5173;
const BASE = `http://localhost:${PORT}`;

const results = [];

function pass(msg) {
  results.push({ ok: true, msg });
}
function fail(msg) {
  results.push({ ok: false, msg });
}

async function fetchJson(path, opts) {
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

console.log('\n═══ strudel-live Workflow Check ═══\n');

// 1. Local files
const patterns = loadAllPatterns();
patterns['01-kick-snare'] ? pass(`${Object.keys(patterns).length} Patterns auf Disk`) : fail('Patterns fehlen');

const health = getHealth(process.env);
health.ai ? pass('AI API-Key') : fail('AI API-Key fehlt');
health.tools.ffmpeg ? pass('ffmpeg') : fail('ffmpeg fehlt');
health.paths.manifest ? pass('manifest.json') : fail('manifest.json fehlt');

// 2. Dev server APIs
let serverUp = false;
try {
  const { status, data } = await fetchJson('/api/health');
  if (status === 200 && data.ok) {
    serverUp = true;
    pass(`Dev-Server :${PORT} — /api/health`);
    data.ai ? pass('  ↳ AI configured') : fail('  ↳ AI not configured');
    pass(`  ↳ ${data.patterns} patterns · ${data.djTracks} DJ tracks`);
    if (!data.servers.samples) fail('  ↳ Sample-Server :5432 offline (npm run dev:full)');
    else pass('  ↳ Sample-Server :5432');
  } else fail(`Dev-Server antwortet mit ${status}`);
} catch {
  fail(`Dev-Server nicht erreichbar — npm run dev (Port ${PORT})`);
}

if (serverUp) {
  const endpoints = [
    ['/api/status', 'GET'],
    ['/api/dj/manifest', 'GET'],
    ['/api/patterns', 'GET'],
  ];
  for (const [path, method] of endpoints) {
    const { status, data } = await fetchJson(path, { method });
    status === 200 && data.ok !== false ? pass(`${method} ${path}`) : fail(`${method} ${path} → ${status}`);
  }

  const { status, data } = await fetchJson('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'minimal kick snare test 120 bpm, 2 lines only' }),
  });
  if (status === 200 && data.ok && data.code?.includes('setcpm')) {
    pass('POST /api/generate (live AI)');
  } else if (status === 401) {
    pass('POST /api/generate (reachable, API-Key ungültig — .env prüfen)');
  } else if (status === 503) {
    fail('POST /api/generate — kein API Key');
  } else {
    fail(`POST /api/generate → ${status}: ${data.error || 'unexpected'}`);
  }
}

// 3. Module imports
const importChecks = [
  '../server/generate.mjs',
  '../server/transition.mjs',
  '../server/synthdef.mjs',
  '../server/hydra.mjs',
  '../server/conductor.mjs',
  '../server/ignite.mjs',
  '../server/faust.mjs',
  '../server/transcribe.mjs',
];
for (const mod of importChecks) {
  try {
    await import(mod);
    pass(`import ${mod.split('/').pop()}`);
  } catch (e) {
    fail(`import ${mod}: ${e.message}`);
  }
}

console.log('');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.msg}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} Problem(e) — siehe docs/WORKFLOW.md\n` : '\n✓ Workflow integriert\n');
process.exit(failed ? 1 : 0);
