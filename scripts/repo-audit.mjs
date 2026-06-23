#!/usr/bin/env node
/**
 * Vollständiger Repo-Audit — Doku, APIs, Module, Build.
 * npm run audit
 */
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import WebSocket from 'ws';

config();

const ROOT = process.cwd();
const PORT = process.env.PORT || 5173;
const BASE = `http://localhost:${PORT}`;
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const results = [];
const pass = (m) => results.push({ ok: true, msg: m });
const fail = (m) => results.push({ ok: false, msg: m });

async function fetchJson(path, opts) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, signal: ac.signal });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`\n═══ strudel-live Audit (v${pkg.version}) ═══\n`);

// --- Version (health reads package.json) ---
pass(`package.json v${pkg.version}`);

// --- Required docs ---
const REQUIRED_DOCS = [
  'README.md',
  'docs/ROADMAP.md',
  'docs/WORKFLOW.md',
  'docs/ARCHITECTURE.md',
  'docs/DJ-ROADMAP.md',
  'docs/SOUND-VISION.md',
  'docs/PROMPT-BOOK.md',
  'docs/MUSIC-LOGIC.md',
  'docs/MINI-NOTATION.md',
  'docs/MIDI-MAC.md',
  'docs/SUPERCOLLIDER.md',
  'docs/FEATURES.md',
  'docs/V0.6-ROADMAP.md',
  'docs/ABLETON-LINK.md',
  'docs/RAVE.md',
  'docs/CLUB-HARDENING.md',
  'docs/LOCAL-AI.md',
];

for (const doc of REQUIRED_DOCS) {
  existsSync(join(ROOT, doc)) ? pass(`doc ${doc}`) : fail(`doc fehlt: ${doc}`);
}

// --- Frontend modules (v0.5.x) ---
const FRONTEND_MODULES = [
  'src/workflow-hub.js',
  'src/ignite-boot.js',
  'src/prompt-book.js',
  'src/stem-analyser.js',
  'src/conductor-panel.js',
  'src/strudel-quantize.js',
  'src/quantize-cue.js',
  'src/panic.js',
  'src/faust-host.js',
  'src/rave-client.js',
  'src/link-sync.js',
  'src/link-pi-sync.js',
  'src/wam-host.js',
  'src/hydra-panel.js',
];

for (const f of FRONTEND_MODULES) {
  existsSync(join(ROOT, f)) ? pass(`module ${f.split('/').pop()}`) : fail(`fehlt ${f}`);
}

// --- Server modules ---
const SERVER_MODULES = [
  'server/api.mjs',
  'server/ignite.mjs',
  'server/conductor.mjs',
  'server/music-constraints.mjs',
  'server/panic-bus.mjs',
  'server/faust.mjs',
  'server/rave-server.mjs',
  'server/rave-onnx.mjs',
  'server/link-clock.mjs',
  'server/link-ws.mjs',
  'server/boot.mjs',
];

for (const f of SERVER_MODULES) {
  existsSync(join(ROOT, f)) ? pass(`server ${f.split('/').pop()}`) : fail(`fehlt ${f}`);
}

// --- music-constraints ---
try {
  const { applyMusicConstraints } = await import('../server/music-constraints.mjs');
  const r = applyMusicConstraints('s("bd*4")', { bpm: 128, scale: 'A minor' });
  r.code.includes('setcpm') ? pass('music-constraints (BPM inject)') : fail('music-constraints broken');
} catch (e) {
  fail(`music-constraints: ${e.message}`);
}

try {
  const { validateStrudelSyntax } = await import('../server/code-validate.mjs');
  const ok = validateStrudelSyntax('setcpm(35)\ns("bd*4")');
  const bad = validateStrudelSyntax('setcpm(35\ns("bd")');
  ok.ok && !bad.ok ? pass('code-validate (acorn)') : fail('code-validate broken');
} catch (e) {
  fail(`code-validate: ${e.message}`);
}

try {
  const { initRaveOnnx, getRaveOnnxStatus } = await import('../server/rave-onnx.mjs');
  await initRaveOnnx(process.env);
  getRaveOnnxStatus().mode === 'passthrough' ? pass('rave-onnx (passthrough)') : pass('rave-onnx (model)');
  const st = getRaveOnnxStatus();
  st.tensorPool === false && st.mode === 'passthrough'
    ? pass('rave-onnx tensor-pool (idle)')
    : st.tensorPool
      ? pass('rave-onnx tensor-pool')
      : fail('rave-onnx pool missing');
} catch (e) {
  fail(`rave-onnx: ${e.message}`);
}

try {
  const { linkCpm } = await import('../server/link-clock.mjs');
  typeof linkCpm === 'function' ? pass('link-clock module') : fail('link-clock broken');
} catch (e) {
  fail(`link-clock: ${e.message}`);
}

// --- Build artifact ---
existsSync(join(ROOT, 'dist/index.html'))
  ? pass('dist/ (production build vorhanden)')
  : fail('dist/ fehlt — npm run build');

// --- Dev server API smoke ---
let serverUp = false;
try {
  const { status, data } = await fetchJson('/api/health');
  if (status === 200 && data.ok) {
    serverUp = true;
    data.version === pkg.version
      ? pass(`/api/health version ${data.version}`)
      : fail(`/api/health version ${data.version} ≠ package ${pkg.version}`);
  }
} catch {
  fail('Dev-Server offline — npm run dev:full für API-Tests');
}

if (serverUp) {
  const apiTests = [
    ['GET', '/api/panic', null, (d) => d.ok && 'at' in d],
    ['POST', '/api/panic', '{}', (d) => d.ok && d.at],
    ['GET', '/api/link', null, (d) => d.ok && 'bpm' in d],
    ['POST', '/api/ignite', '{"prompt":""}', (d) => d.status === 400 || !d.ok],
    ['POST', '/api/faust', '{"code":""}', (d) => d.status === 400 || !d.ok],
  ];

  for (const [method, path, body, check] of apiTests) {
    const opts = { method, headers: body ? { 'Content-Type': 'application/json' } : {} };
    if (body) opts.body = body;
    const { status, data } = await fetchJson(path, opts);
    const ok = check({ ...data, status });
    ok ? pass(`${method} ${path}`) : fail(`${method} ${path} → ${status}`);
  }

  try {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/api/link/ws`);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('timeout'));
      }, 5000);
      ws.on('message', (raw) => {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'LINK_CLOCK_UPDATE' && msg.payload?.bpm) {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
    });
    pass('WS /api/link/ws');
  } catch (e) {
    fail(`WS /api/link/ws — ${e.message}`);
  }
}

// --- npm scripts documented in README ---
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const scripts = Object.keys(pkg.scripts).filter((s) => !['preview', 'patterns'].includes(s));
let scriptsDoc = 0;
for (const s of scripts) {
  if (readme.includes(s)) scriptsDoc++;
}
scriptsDoc >= scripts.length - 2
  ? pass(`README deckt ${scriptsDoc}/${scripts.length} npm scripts ab`)
  : fail(`README dokumentiert nur ${scriptsDoc}/${scripts.length} scripts`);

console.log('');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.msg}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} Audit-Problem(e)\n` : '\n✓ Audit bestanden\n');
process.exit(failed ? 1 : 0);
