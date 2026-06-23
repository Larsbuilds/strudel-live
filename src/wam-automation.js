/** Apply WAM automation params from AI Conductor JSON — ramped AudioParams. */
import { getWamAudioContext } from './wam-host.js';

const DEFAULT_RAMP_MS = 80;

let currentWam = null;

export function registerWamInstance(wam) {
  currentWam = wam;
}

const PARAM_ALIASES = {
  cutoff: ['cutoff', 'filter', 'lpf', 'Cutoff'],
  resonance: ['resonance', 'q', 'Resonance'],
  gain: ['gain', 'volume', 'Gain'],
  distortion: ['distortion', 'drive', 'Distortion'],
};

function isFrequencyLike(name) {
  return /cutoff|freq|filter|lpf/i.test(name);
}

/**
 * Knackfreie Rampe auf einem Web-Audio AudioParam.
 */
export function rampAudioParam(param, paramName, targetValue, audioCtx, durationMs = DEFAULT_RAMP_MS) {
  if (!param || !audioCtx) return false;

  const now = audioCtx.currentTime;
  const end = now + durationMs / 1000;
  const target = Math.max(0, Math.min(1, targetValue));

  param.cancelScheduledValues(now);
  const current = Number.isFinite(param.value) ? param.value : target;
  param.setValueAtTime(Math.max(0.001, current), now);

  if (isFrequencyLike(paramName) && target > 0.001) {
    param.exponentialRampToValueAtTime(Math.max(0.001, target), end);
  } else {
    param.linearRampToValueAtTime(target, end);
  }
  return true;
}

export function applyWamAutomation(params = {}, options = {}) {
  const rampMs = options.rampMs ?? DEFAULT_RAMP_MS;
  const audioCtx = getWamAudioContext();

  if (!currentWam?.audioNode?.parameters) {
    return { applied: false, reason: 'No WAM loaded' };
  }

  const applied = [];
  const paramsObj = currentWam.audioNode.parameters;

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'number') continue;
    const names = PARAM_ALIASES[key] || [key];
    for (const name of names) {
      const p = paramsObj.get?.(name);
      if (p && rampAudioParam(p, name, value, audioCtx, rampMs)) {
        applied.push(name);
        break;
      }
    }
  }

  // Fallback: WAM plugins ohne AudioParam-Map
  if (!applied.length && typeof currentWam.audioNode.setParameterValues === 'function') {
    currentWam.audioNode.setParameterValues(params);
    return { applied: true, names: Object.keys(params), fallback: true };
  }

  return { applied: applied.length > 0, names: applied };
}

const WAM_DEFAULTS = { cutoff: 1, resonance: 0.3, gain: 0.7, distortion: 0 };

export function resetWamAutomation() {
  return applyWamAutomation(WAM_DEFAULTS, { rampMs: 40 });
}
