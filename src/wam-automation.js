/** Apply WAM automation params from AI Conductor JSON. */
import { getWamAudioContext } from './wam-host.js';

let currentWam = null;

export function registerWamInstance(wam) {
  currentWam = wam;
}

export function applyWamAutomation(params = {}) {
  if (!currentWam?.audioNode?.parameters) {
    return { applied: false, reason: 'No WAM loaded' };
  }

  const map = {
    cutoff: ['cutoff', 'filter', 'lpf', 'Cutoff'],
    resonance: ['resonance', 'q', 'Resonance'],
    gain: ['gain', 'volume', 'Gain'],
    distortion: ['distortion', 'drive', 'Distortion'],
  };

  const applied = [];
  const paramsObj = currentWam.audioNode.parameters;

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'number') continue;
    const names = map[key] || [key];
    for (const name of names) {
      const p = paramsObj.get?.(name);
      if (p) {
        p.setValueAtTime(Math.max(0, Math.min(1, value)), getWamAudioContext()?.currentTime ?? 0);
        applied.push(name);
        break;
      }
    }
  }

  return { applied: applied.length > 0, names: applied };
}

const WAM_DEFAULTS = { cutoff: 1, resonance: 0.3, gain: 0.7, distortion: 0 };

export function resetWamAutomation() {
  return applyWamAutomation(WAM_DEFAULTS);
}
