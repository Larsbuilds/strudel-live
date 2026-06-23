import { updateDjCc, djState } from './dj-state.js';
import { applyMasterGain } from './transport.js';

/** On-screen DJ mixer — mirrors MIDI CC8/1/2 for mouse/touch control. */
export function initDjFaders() {
  const master = document.getElementById('fader-master');
  const filter = document.getElementById('fader-filter');
  const cross = document.getElementById('fader-cross');
  if (!master) return;

  function syncUi() {
    if (master) master.value = String(djState.cc.master ?? 0.85);
    if (filter) filter.value = String(djState.cc[1] ?? 0.65);
    if (cross) cross.value = String(djState.crossfader ?? 0.5);
  }

  master.addEventListener('input', () => {
    const v = Number(master.value);
    djState.cc.master = v;
    applyMasterGain(v);
    publishFaders();
  });

  filter?.addEventListener('input', () => {
    updateDjCc(1, Number(filter.value));
    publishFaders();
  });

  cross?.addEventListener('input', () => {
    updateDjCc(8, Number(cross.value));
    publishFaders();
  });

  syncUi();
  applyMasterGain(Number(master.value));
  publishFaders();
}

function publishFaders() {
  globalThis.dj_faders = {
    master: () => djState.cc.master ?? 0.85,
    filter: () => djState.cc[1] ?? 0.65,
    crossfader: () => djState.crossfader ?? 0.5,
    lpfA: () => djState.lpfA,
    lpfB: () => djState.lpfB,
  };
  window.dispatchEvent(new CustomEvent('strudel-live:dj-faders', { detail: globalThis.dj_faders }));
}
