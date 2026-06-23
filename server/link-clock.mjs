/**
 * Ableton Link clock — shared tempo/beat grid for club sync.
 * Env: LINK_ENABLED=true (default), LINK_BPM=120
 */
let link = null;
let state = {
  available: false,
  enabled: false,
  bpm: 120,
  beat: 0,
  phase: 0,
  peers: 0,
  at: 0,
  error: null,
};

const tickListeners = new Set();

export function onLinkTick(fn) {
  tickListeners.add(fn);
  return () => tickListeners.delete(fn);
}

function emitTick() {
  for (const fn of tickListeners) {
    try {
      fn(state);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function initLinkClock(env = process.env) {
  if (env.LINK_ENABLED === 'false' || env.LINK_ENABLED === '0') {
    state = { ...state, available: false, enabled: false, error: 'disabled via LINK_ENABLED' };
    return state;
  }
  if (link) return state;

  try {
    // eslint-disable-next-line import/no-unresolved
    const AbletonLink = globalThis.__abletonLinkCtor;
    if (!AbletonLink) throw new Error('Ableton Link module not loaded');

    const startBpm = Number(env.LINK_BPM) || 120;
    link = new AbletonLink(startBpm);
    link.enable();
    link.startUpdate(15, (beat, phase, bpm) => {
      state = {
        available: true,
        enabled: true,
        beat,
        phase,
        bpm,
        peers: link.numPeers ?? 0,
        at: Date.now(),
        error: null,
      };
      emitTick();
    });
    state = { ...state, available: true, enabled: true, bpm: startBpm, error: null };
    console.log(`[link] Ableton Link aktiv — Start ${startBpm} BPM`);
  } catch (err) {
    state = { ...state, available: false, enabled: false, error: err.message };
    console.warn('[link] nicht verfügbar:', err.message);
  }
  return state;
}

export async function loadLinkModule() {
  if (globalThis.__abletonLinkCtor) return globalThis.__abletonLinkCtor;
  const mod = await import('abletonlink');
  const Ctor = mod.default ?? mod;
  globalThis.__abletonLinkCtor = Ctor;
  return Ctor;
}

export async function ensureLinkClock(env = process.env) {
  if (!globalThis.__abletonLinkCtor) {
    try {
      await loadLinkModule();
    } catch (err) {
      state.error = err.message;
      return state;
    }
  }
  return initLinkClock(env);
}

export function getLinkState() {
  return { ...state };
}

export function setLinkBpm(bpm) {
  if (!link || !Number.isFinite(bpm)) return false;
  link.bpm = bpm;
  state.bpm = bpm;
  return true;
}

/** Strudel setcpm value from Link BPM (4/4 bar = 1 cycle). */
export function linkCpm() {
  return (state.bpm || 120) / 4;
}

export function linkBeatInBar(quantum = 4) {
  if (!state.enabled) return null;
  return state.phase % 1; // phase within beat; beat is absolute
}

export function getLinkPhaseInBar() {
  if (!state.enabled) return null;
  return state.beat % 4; // 0-4 in 4/4
}
