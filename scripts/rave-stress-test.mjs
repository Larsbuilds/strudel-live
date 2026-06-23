#!/usr/bin/env node
/**
 * RAVE ONNX / Passthrough Dauerlauf — RAM-Stabilität (v0.6.2 gig hardening).
 *
 * 512 Samples @ 44,1 kHz ≈ 86 Hz — Ziel: flacher RSS über Stunden.
 *
 * Direkt (Tensor-Pool):  npm run stress:rave
 * Via WebSocket:        npm run stress:rave -- --ws
 * 2h Gig-Vorbereitung:  STRESS_DURATION=7200 npm run stress:rave
 *
 * Optional: RAVE_MODEL_PATH + RAVE_EXECUTION_PROVIDER=cuda
 */
import { config } from 'dotenv';
import WebSocket from 'ws';
import { initRaveOnnx, transformPcmFrame, getRaveOnnxStatus } from '../server/rave-onnx.mjs';

config();

const FRAME_SIZE = Number(process.env.STRESS_FRAME_SIZE || 512);
const SAMPLE_RATE = 44100;
const FRAME_HZ = SAMPLE_RATE / FRAME_SIZE;
const INTERVAL_MS = 1000 / FRAME_HZ;
const DURATION_SEC = Number(process.env.STRESS_DURATION || 60);
const WARMUP_SEC = Number(process.env.STRESS_WARMUP_SEC || 30);
const LOG_EVERY_SEC = Number(process.env.STRESS_LOG_EVERY_SEC || 60);
const MAX_RSS_GROWTH_MB = Number(process.env.STRESS_MAX_RSS_MB || 100);
const USE_WS = process.argv.includes('--ws');
const RAVE_PORT = Number(process.env.RAVE_PORT || 8765);

function mb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

function memSnap() {
  const m = process.memoryUsage();
  return { rss: m.rss, heap: m.heapUsed, external: m.external };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeFrame() {
  const buf = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    buf[i] = Math.sin((i / FRAME_SIZE) * Math.PI * 2) * 0.1;
  }
  return buf;
}

async function runDirect(frame, durationSec) {
  await initRaveOnnx(process.env);
  const status = getRaveOnnxStatus();
  console.log(`Modus: ${status.mode} (${status.executionProvider}) pool=${status.tensorPool}`);

  const start = Date.now();
  let frames = 0;
  let errors = 0;
  const logs = [];
  let lastLogSec = -1;

  while ((Date.now() - start) / 1000 < durationSec) {
    const t0 = performance.now();
    try {
      await transformPcmFrame(frame);
      frames++;
    } catch {
      errors++;
    }
    const wait = Math.max(0, INTERVAL_MS - (performance.now() - t0));
    await sleep(wait);

    const sec = Math.floor((Date.now() - start) / 1000);
    if (sec > 0 && sec % LOG_EVERY_SEC === 0 && sec !== lastLogSec) {
      lastLogSec = sec;
      const snap = memSnap();
      logs.push({ sec, ...snap });
      console.log(
        `[${String(sec).padStart(5)}s] frames=${frames} rss=${mb(snap.rss)}MB heap=${mb(snap.heap)}MB ext=${mb(snap.external)}MB`,
      );
    }
  }

  return { frames, errors, logs, status };
}

async function runWebSocket(frame, durationSec) {
  const url = `ws://localhost:${RAVE_PORT}`;
  console.log(`WebSocket: ${url}`);

  const ws = await new Promise((resolve, reject) => {
    const sock = new WebSocket(url);
    sock.binaryType = 'arraybuffer';
    const t = setTimeout(() => reject(new Error('RAVE WS timeout')), 5000);
    sock.on('open', () => {
      clearTimeout(t);
      resolve(sock);
    });
    sock.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
  });

  const start = Date.now();
  let frames = 0;
  let errors = 0;
  const logs = [];

  ws.on('message', () => {});

  while ((Date.now() - start) / 1000 < durationSec) {
    const t0 = performance.now();
    try {
      await new Promise((resolve, reject) => {
        const onMsg = () => {
          ws.off('message', onMsg);
          resolve();
        };
        ws.on('message', onMsg);
        ws.send(Buffer.from(frame.buffer));
        setTimeout(() => reject(new Error('frame timeout')), 500);
      });
      frames++;
    } catch {
      errors++;
    }
    await sleep(Math.max(0, INTERVAL_MS - (performance.now() - t0)));

    const sec = (Date.now() - start) / 1000;
    if (Math.round(sec) % LOG_EVERY_SEC === 0 && sec > 0) {
      const snap = memSnap();
      logs.push({ sec: Math.round(sec), ...snap });
      console.log(`[${String(Math.round(sec)).padStart(5)}s] frames=${frames} rss=${mb(snap.rss)}MB`);
    }
  }

  ws.close();
  return { frames, errors, logs, status: { mode: 'ws-bridge' } };
}

async function main() {
  console.log('\n═══ RAVE Endurance Stress (v0.6.2) ═══\n');
  console.log(`Frame: ${FRAME_SIZE} @ ${FRAME_HZ.toFixed(1)} Hz · Dauer: ${DURATION_SEC}s · Warmup: ${WARMUP_SEC}s`);
  if (DURATION_SEC < 300) {
    console.log('Hinweis: Für Gig-Härtetest STRESS_DURATION=7200 (2h) setzen.\n');
  }

  const frame = makeFrame();
  const result = USE_WS ? await runWebSocket(frame, DURATION_SEC) : await runDirect(frame, DURATION_SEC);

  const postWarmup = result.logs.filter((l) => l.sec >= WARMUP_SEC);
  const baseline = postWarmup[0] ?? result.logs[0];
  const final = result.logs[result.logs.length - 1] ?? memSnap();

  const rssGrowth = baseline ? mb(final.rss - baseline.rss) : 0;
  const fps = result.frames / DURATION_SEC;

  console.log('\n── Ergebnis ──');
  console.log(`Frames: ${result.frames} (${fps.toFixed(1)} fps) · Fehler: ${result.errors}`);
  if (baseline) {
    console.log(`RSS nach Warmup: ${mb(baseline.rss)} MB → Ende: ${mb(final.rss)} MB (Δ ${rssGrowth} MB)`);
  }

  if (result.status.mode === 'passthrough' && !USE_WS) {
    console.log('\n⚠ Passthrough-Modus — Tensor-Pool idle. Für echten Test RAVE_MODEL_PATH setzen.');
  }

  const pass = result.errors === 0 && rssGrowth <= MAX_RSS_GROWTH_MB;
  if (pass) {
    console.log('\n✓ RAVE-Stresstest bestanden (RSS stabil)\n');
    process.exit(0);
  }

  console.log('\n✗ RAVE-Stresstest fehlgeschlagen');
  if (result.errors) console.log(`  → ${result.errors} Frame-Fehler`);
  if (rssGrowth > MAX_RSS_GROWTH_MB) console.log(`  → RSS wuchs um ${rssGrowth} MB (Limit ${MAX_RSS_GROWTH_MB})`);
  console.log('');
  process.exit(1);
}

main().catch((e) => {
  console.error('✗', e.message);
  if (USE_WS) console.error('  → npm run rave:server in zweitem Terminal?');
  process.exit(1);
});
