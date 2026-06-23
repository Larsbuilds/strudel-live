/**
 * PI phase-lock: Strudel scheduler CPS follows Ableton Link grid.
 * v0.6.2: dt-based integrator, tighter anti-windup (research-tuned).
 */
import { waitForRepl } from './ai-panel.js';
import { getReplScheduler } from './strudel-quantize.js';

const QUANTUM = 4;
const DEFAULT_KP = 0.12;
const DEFAULT_KI = 0.015;
const MAX_INTEGRAL = 0.05;
const MIN_CPS = 0.05;

export class LinkPiSync {
  constructor(editor, options = {}) {
    this.editor = editor;
    this.kp = options.kp ?? DEFAULT_KP;
    this.ki = options.ki ?? DEFAULT_KI;
    this.integralError = 0;
    this.lastTime = performance.now();
    this.mirror = null;
    this.lastPayload = null;
  }

  reset() {
    this.integralError = 0;
    this.lastTime = performance.now();
  }

  async ensureMirror() {
    if (!this.mirror) {
      this.mirror = await waitForRepl(this.editor);
    }
    return this.mirror;
  }

  /**
   * @param {object} payload — from LINK_CLOCK_UPDATE (beat, bpm, at, serverTime)
   */
  async processClockUpdate(payload) {
    if (!payload?.enabled || !Number.isFinite(payload.bpm)) return null;

    const mirror = await this.ensureMirror();
    const scheduler = getReplScheduler(mirror);
    if (!scheduler?.started) return null;

    const setCps = mirror.repl?.setCps;
    if (typeof setCps !== 'function') return null;

    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    const rttMs = Math.max(0, Date.now() - (payload.serverTime ?? payload.at ?? Date.now()));
    const latencySec = rttMs / 1000;
    const beatsPerSec = payload.bpm / 60;
    const projectedBeat = payload.beat + latencySec * beatsPerSec;
    const targetPhase = projectedBeat % QUANTUM;

    const localCycle = scheduler.now();
    const localPhase = (localCycle % 1) * QUANTUM;

    let phaseError = targetPhase - localPhase;
    if (phaseError > QUANTUM / 2) phaseError -= QUANTUM;
    if (phaseError < -QUANTUM / 2) phaseError += QUANTUM;

    this.integralError += phaseError * dt;
    this.integralError = Math.max(-MAX_INTEGRAL, Math.min(MAX_INTEGRAL, this.integralError));

    const correction = this.kp * phaseError + this.ki * this.integralError;
    const baseCps = payload.bpm / 240;
    const adjustedCps = Math.max(MIN_CPS, baseCps + correction);

    setCps.call(mirror.repl, adjustedCps);
    this.lastPayload = { ...payload, adjustedCps, phaseError, rttMs, dt };
    return this.lastPayload;
  }
}
