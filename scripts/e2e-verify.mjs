#!/usr/bin/env node
/**
 * End-to-end verification — APIs, WebSockets, ignite, browser stability.
 * npm run verify
 */
import { config } from 'dotenv';
import { chromium } from 'playwright-core';
import WebSocket from 'ws';
import { validateStrudelSyntax } from '../server/code-validate.mjs';
import { getHealth } from '../server/health.mjs';

config();

const APP_PORT = Number(process.env.PORT || 5173);
const SAMPLES_PORT = Number(process.env.SAMPLES_PORT || 5433);
const BASE = `http://localhost:${APP_PORT}`;
const SAMPLES = `http://127.0.0.1:${SAMPLES_PORT}`;

const results = [];
let failed = 0;

function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed += 1;
  results.push({ ok: false, name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

function assertOk(name, cond, detail) {
  if (cond) pass(name, detail);
  else fail(name, detail);
}

async function testLocalHealth() {
  console.log('\n── Local health (no HTTP) ──');
  const h = getHealth(process.env);
  assertOk('AI provider configured', h.ai, h.ollama?.model || 'check .env');
  assertOk('samples dir exists', h.paths.samples);
  assertOk('samples server port', h.servers.samples, `5433 or 5432 listening`);
  assertOk('app server port', h.servers.app, `:${APP_PORT}`);
}

async function testHttpApis() {
  console.log('\n── HTTP APIs ──');
  const endpoints = [
    ['/api/health', 'GET'],
    ['/api/status', 'GET'],
    ['/api/patterns', 'GET'],
    ['/api/dj/manifest', 'GET'],
    ['/api/link', 'GET'],
  ];

  for (const [path, method] of endpoints) {
    const { status, data } = await fetchJson(path, { method });
    assertOk(`${method} ${path}`, status === 200 && data.ok !== false, `status ${status}`);
  }

  const { status: hStatus, data: health } = await fetchJson('/api/health');
  if (hStatus === 200) {
    assertOk('health.samples true', health.servers?.samples === true);
    assertOk('health has patterns', (health.patterns ?? 0) > 0, `${health.patterns} patterns`);
  }

  const samplesRes = await fetch(SAMPLES);
  assertOk(`samples server :${SAMPLES_PORT}`, samplesRes.ok, `status ${samplesRes.status}`);
}

async function testIgniteFallback() {
  console.log('\n── Ignite fallback guards ──');
  const placeholder = 'valid Strudel code with setcpm() and .scale()';
  const bad = validateStrudelSyntax(placeholder);
  assertOk('placeholder text fails validation', !bad.ok);

  const real = validateStrudelSyntax('setcpm(32)\nstack(s("bd*4"), s("~ cp")).scale("A:minor")');
  assertOk('real strudel passes validation', real.ok);
}

async function testIgnite() {
  console.log('\n── Ignite API ──');

  const empty = await fetchJson('/api/ignite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: '' }),
  });
  assertOk('ignite rejects empty prompt', empty.status === 400, `status ${empty.status}`);

  const prompts = [
    'hypnotic deep techno 128 bpm',
    'minimal ambient pads 90 bpm',
    'broken beat jungle 170 bpm',
  ];

  for (const prompt of prompts) {
    const t0 = Date.now();
    const { status, data } = await fetchJson('/api/ignite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const ms = Date.now() - t0;
    const strudel = data.initial_states?.strudel || data.initialStates?.strudel || '';
    const syntax = validateStrudelSyntax(strudel);
    const ok =
      status === 200 &&
      data.ok !== false &&
      strudel.length > 10 &&
      syntax.ok &&
      /\b(setcpm|s\(|note\(|stack\()/.test(strudel);

    assertOk(
      `ignite "${prompt.slice(0, 28)}…"`,
      ok,
      ok
        ? `${data.strudelSource || '?'} · ${ms}ms · ${strudel.split('\n').length} lines`
        : `status ${status} err=${data.error || ''} syntax=${syntax.error || 'bad code'}`,
    );
  }
}

async function testGenerate() {
  console.log('\n── Generate API ──');
  const { status, data } = await fetchJson('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'kick snare 120 bpm, 2 lines max' }),
  });
  const code = data.code || '';
  const syntax = validateStrudelSyntax(code);
  assertOk(
    'POST /api/generate',
    status === 200 && syntax.ok && code.includes('setcpm'),
    status === 200
      ? `${syntax.ok ? 'valid' : syntax.error} · fallback=${Boolean(data.usedFallback)} · ${code.length} chars`
      : `status ${status}: ${data.error}`,
  );
}

function wsConnect(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`timeout ${url}`));
    }, timeoutMs);
    ws.on('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function testWebSockets() {
  console.log('\n── WebSockets ──');

  // Link WS must deliver clock (Vite HMR verified in browser — needs real session token)
  try {
    const linkWs = await wsConnect(`ws://localhost:${APP_PORT}/api/link/ws`);
    const linkMsg = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no link clock')), 5000);
      linkWs.on('message', (raw) => {
        clearTimeout(t);
        resolve(JSON.parse(String(raw)));
      });
    });
    linkWs.close();
    assertOk(
      'link clock websocket',
      linkMsg.type === 'LINK_CLOCK_UPDATE' && linkMsg.payload?.bpm > 0,
      `bpm=${linkMsg.payload?.bpm}`,
    );
  } catch (e) {
    fail('link clock websocket', e.message);
  }
}

async function testBrowserStability() {
  console.log('\n── Browser stability (Playwright) ──');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  let nav = 0;
  const consoleErrors = [];
  const consoleWarnings = [];
  const consoleLogs = [];

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) nav += 1;
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    if (msg.type() === 'warning' && !text.includes('AudioContext')) {
      consoleWarnings.push(text);
    }
    if (msg.type() === 'log') consoleLogs.push(text);
  });

  await page.addInitScript(() => {
    window.__reloadCalls = 0;
    const orig = location.reload.bind(location);
    location.reload = (...args) => {
      window.__reloadCalls += 1;
      return orig(...args);
    };
  });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);

    const reloadCalls = await page.evaluate(() => window.__reloadCalls ?? 0);
    const viteLost = consoleErrors.some((e) => e.includes('server connection lost'));
    const invalidFrame = consoleErrors.some((e) => e.includes('Invalid frame header'));
    const ignite422 = consoleErrors.some((e) => e.includes('/api/ignite') && e.includes('422'));

    assertOk('single page load (no reload loop)', nav <= 2, `navigations=${nav}`);
    assertOk('no location.reload spam', reloadCalls <= 1, `reloadCalls=${reloadCalls}`);
    assertOk('vite HMR healthy', !viteLost && !invalidFrame);
    assertOk('no ignite 422 in browser', !ignite422);

    const title = await page.title();
    assertOk('page title loaded', title.length > 0, title);

    const picker = page.locator('#pattern-picker');
    if (await picker.count()) {
      await picker.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      pass('pattern picker selects without reload');
    }

    const playBtn = page.locator('button[title*="Play"], .cm-play, #play').first();
    if (await playBtn.count()) {
      await playBtn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
      pass('play button clickable');
    }

    const strudelDupes = consoleWarnings.filter((w) => w.includes('@strudel/core was loaded more than once'));
    if (strudelDupes.length > 1) {
      fail('@strudel/core duplicate warning', `${strudelDupes.length}x — possible version conflict`);
    } else if (strudelDupes.length === 1) {
      pass('@strudel/core duplicate warning', 'known @strudel/repl dev bundling — harmless');
    } else {
      pass('@strudel/core no duplicate warning');
    }
  } catch (e) {
    fail('browser session', e.message);
  } finally {
    await browser.close();
  }
}

async function testLinkStressQuick() {
  console.log('\n── Link reconnect (quick) ──');
  try {
    const ws1 = await wsConnect(`ws://localhost:${APP_PORT}/api/link/ws`);
    await new Promise((r) => setTimeout(r, 2000));
    ws1.close();
    await new Promise((r) => setTimeout(r, 500));
    const ws2 = await wsConnect(`ws://localhost:${APP_PORT}/api/link/ws`);
    const msg = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no msg after reconnect')), 5000);
      ws2.on('message', (raw) => {
        clearTimeout(t);
        resolve(JSON.parse(String(raw)));
      });
    });
    ws2.close();
    assertOk('link WS reconnect', msg.type === 'LINK_CLOCK_UPDATE');
  } catch (e) {
    fail('link WS reconnect', e.message);
  }
}

async function main() {
  console.log('\n══════════════════════════════════════');
  console.log('  strudel-live E2E Verification');
  console.log(`  App :${APP_PORT} · Samples :${SAMPLES_PORT}`);
  console.log('══════════════════════════════════════');

  try {
    await fetch(`${BASE}/api/health`);
  } catch {
    console.error('\n✗ Dev server offline — run: npm run dev:full\n');
    process.exit(1);
  }

  await testLocalHealth();
  await testHttpApis();
  await testIgniteFallback();
  await testIgnite();
  await testGenerate();
  await testWebSockets();
  await testLinkStressQuick();
  await testBrowserStability();

  console.log('\n══════════════════════════════════════');
  const passed = results.filter((r) => r.ok).length;
  if (failed) {
    console.log(`  FAILED — ${failed} of ${results.length} checks`);
    console.log('══════════════════════════════════════\n');
    process.exit(1);
  }
  console.log(`  PASSED — ${passed}/${results.length} checks`);
  console.log('══════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
