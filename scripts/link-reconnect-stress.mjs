#!/usr/bin/env node
/**
 * Link WebSocket + PI re-lock stress test (v0.6.2 gig hardening).
 *
 * Simuliert: Track läuft → WS-Drop 15s → Reconnect → PI muss in ≤3 Cycles einfangen.
 *
 * Voraussetzung: npm run dev oder npm start (Link aktiv)
 *
 * npm run stress:link
 */
import { config } from 'dotenv';
import WebSocket from 'ws';

config();

const PORT = process.env.PORT || 5173;
const WS_URL = `ws://localhost:${PORT}/api/link/ws`;
const BASELINE_SEC = Number(process.env.STRESS_LINK_BASELINE_SEC || 20);
const OUTAGE_SEC = Number(process.env.STRESS_LINK_OUTAGE_SEC || 15);
const RECOVERY_SEC = Number(process.env.STRESS_LINK_RECOVERY_SEC || 30);
const MAX_CYCLES_TO_LOCK = Number(process.env.STRESS_LINK_MAX_CYCLES || 3);
const PHASE_OK = Number(process.env.STRESS_LINK_PHASE_OK || 0.25);

const QUANTUM = 4;
const KP = 0.12;
const KI = 0.015;
const MAX_INTEGRAL = 0.05;

class MockScheduler {
  #t0 = performance.now();
  #cycle0 = 0;
  #cps = 128 / 240;

  started = true;

  now() {
    return this.#cycle0 + ((performance.now() - this.#t0) / 1000) * this.#cps;
  }

  setCps(cps) {
    const c = this.now();
    this.#cps = cps;
    this.#cycle0 = c;
    this.#t0 = performance.now();
  }

  get cps() {
    return this.#cps;
  }
}

function piStep(scheduler, payload, state) {
  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0.001, (now - state.lastTime) / 1000));
  state.lastTime = now;

  const rttMs = Math.max(0, Date.now() - (payload.serverTime ?? payload.at ?? Date.now()));
  const projectedBeat = payload.beat + (rttMs / 1000) * (payload.bpm / 60);
  const targetPhase = projectedBeat % QUANTUM;

  const localCycle = scheduler.now();
  const localPhase = (localCycle % 1) * QUANTUM;

  let phaseError = targetPhase - localPhase;
  if (phaseError > QUANTUM / 2) phaseError -= QUANTUM;
  if (phaseError < -QUANTUM / 2) phaseError += QUANTUM;

  state.integral += phaseError * dt;
  state.integral = Math.max(-MAX_INTEGRAL, Math.min(MAX_INTEGRAL, state.integral));

  const correction = KP * phaseError + KI * state.integral;
  const baseCps = payload.bpm / 240;
  scheduler.setCps(Math.max(0.05, baseCps + correction));

  return { phaseError, localCycle, adjustedCps: scheduler.cps };
}

function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WS connect timeout'));
    }, 8000);
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

function collectFor(ws, seconds, scheduler, piState, onSample) {
  return new Promise((resolve) => {
    const end = Date.now() + seconds * 1000;
    const handler = (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type !== 'LINK_CLOCK_UPDATE') return;
        const sample = piStep(scheduler, msg.payload, piState);
        onSample?.({ ...sample, payload: msg.payload, at: Date.now() });
      } catch {
        /* ignore */
      };
    };
    ws.on('message', handler);
    const tick = setInterval(() => {
      if (Date.now() >= end) {
        clearInterval(tick);
        ws.off('message', handler);
        resolve();
      }
    }, 50);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmt(n) {
  return typeof n === 'number' ? n.toFixed(3) : String(n);
}

async function main() {
  console.log('\n═══ Link Reconnect Stress (v0.6.2) ═══\n');
  console.log(`WS: ${WS_URL}`);
  console.log(`Baseline ${BASELINE_SEC}s → Outage ${OUTAGE_SEC}s → Recovery ${RECOVERY_SEC}s\n`);

  try {
    await fetch(`http://localhost:${PORT}/api/link`);
  } catch {
    console.error('✗ App-Server offline — npm run dev oder npm start');
    process.exit(1);
  }

  const scheduler = new MockScheduler();
  const piState = { integral: 0, lastTime: performance.now() };
  const samples = [];

  let ws = await connectWs();
  console.log(`▶ Baseline (${BASELINE_SEC}s)…`);
  await collectFor(ws, BASELINE_SEC, scheduler, piState, (s) => samples.push({ phase: 'baseline', ...s }));

  console.log(`▶ WS-Outage (${OUTAGE_SEC}s) — PI integral reset…`);
  ws.close();
  piState.integral = 0;
  piState.lastTime = performance.now();
  const outageStartCycle = scheduler.now();
  await sleep(OUTAGE_SEC * 1000);

  console.log('▶ Reconnect…');
  ws = await connectWs();
  const recoveryStart = Date.now();
  const recoveryStartCycle = scheduler.now();
  const recoverySamples = [];

  await collectFor(ws, RECOVERY_SEC, scheduler, piState, (s) => {
    const row = { phase: 'recovery', t: (Date.now() - recoveryStart) / 1000, ...s };
    recoverySamples.push(row);
    samples.push(row);
  });

  ws.close();

  const outageCycles = scheduler.now() - outageStartCycle;
  const recoveryErrors = recoverySamples.map((s) => Math.abs(s.phaseError));
  const maxErrAfter = recoveryErrors.length ? Math.max(...recoveryErrors) : Infinity;

  let lockSec = null;
  let lockCycles = null;
  for (const s of recoverySamples) {
    if (Math.abs(s.phaseError) <= PHASE_OK) {
      lockSec = s.t;
      lockCycles = s.localCycle - recoveryStartCycle;
      break;
    }
  }

  const cpsJumps = recoverySamples
    .map((s, i, arr) => (i ? Math.abs(s.adjustedCps - arr[i - 1].adjustedCps) : 0))
    .filter((j) => j > 0);
  const maxCpsJump = cpsJumps.length ? Math.max(...cpsJumps) : 0;

  console.log('\n── Ergebnis ──');
  console.log(`Outage (lokal weitergespielt): ${fmt(outageCycles)} Cycles`);
  console.log(`Max |Phasenfehler| nach Reconnect: ${fmt(maxErrAfter)} Beats`);
  console.log(`Zeit bis Lock (|e|≤${PHASE_OK}): ${lockSec != null ? `${fmt(lockSec)}s` : '—'}`);
  console.log(`Cycles bis Lock: ${lockCycles != null ? fmt(lockCycles) : '—'}`);
  console.log(`Max CPS-Sprung: ${fmt(maxCpsJump)}`);

  const passLock = lockCycles != null && lockCycles <= MAX_CYCLES_TO_LOCK;
  const passJump = maxCpsJump < 0.5;
  const passErr = maxErrAfter < 1.0;

  if (passLock && passJump && passErr) {
    console.log('\n✓ Link-Stresstest bestanden\n');
    console.log('Manuell im Browser: Pattern laufen lassen, WLAN 15s aus, Link-Sync (PI) an — hörbar glatt?');
    process.exit(0);
  }

  console.log('\n✗ Link-Stresstest fehlgeschlagen');
  if (!passLock) console.log(`  → Lock dauerte > ${MAX_CYCLES_TO_LOCK} Cycles`);
  if (!passJump) console.log('  → CPS-Sprung ≥ 0.5 (hörbar riskant)');
  if (!passErr) console.log('  → Phasenfehler ≥ 1 Beat nach Reconnect');
  console.log('');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
