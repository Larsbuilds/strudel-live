import { waitForRepl } from './ai-panel.js';
import { getCyclePhase, getReplScheduler } from './strudel-quantize.js';

let intervalId = null;
let armed = false;

function ensureOverlay() {
  let el = document.getElementById('quantize-cue');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'quantize-cue';
  el.className = 'quantize-cue';
  el.innerHTML = `
    <div class="quantize-cue__ring"></div>
    <div class="quantize-cue__count">—</div>
    <div class="quantize-cue__label">DROP</div>
  `;
  document.body.append(el);
  return el;
}

function updateCueDisplay(phase, label = 'DROP') {
  const el = ensureOverlay();
  const count = el.querySelector('.quantize-cue__count');
  const labelEl = el.querySelector('.quantize-cue__label');
  const ring = el.querySelector('.quantize-cue__ring');

  if (!phase) {
    el.classList.remove('quantize-cue--active', 'quantize-cue--armed', 'quantize-cue--drop');
    return;
  }

  labelEl.textContent = label;
  ring.style.setProperty('--progress', String(1 - phase.posInBar));

  if (phase.drop) {
    el.classList.add('quantize-cue--drop', 'quantize-cue--active');
    count.textContent = 'DROP';
    return;
  }

  if (armed) {
    el.classList.add('quantize-cue--armed', 'quantize-cue--active');
    const n = phase.beatsUntilDrop;
    count.textContent = n <= 1 ? '1' : String(n);
  } else {
    el.classList.add('quantize-cue--active');
    el.classList.remove('quantize-cue--armed', 'quantize-cue--drop');
    count.textContent = String(phase.beatInBar + 1);
  }
}

export function armQuantizeCue(label = 'DROP') {
  armed = true;
  ensureOverlay().dataset.label = label;
}

export function disarmQuantizeCue() {
  armed = false;
  const el = document.getElementById('quantize-cue');
  el?.classList.remove('quantize-cue--armed', 'quantize-cue--drop');
}

const POLL_MS = 250;
const HIDE_AFTER_MISSES = 4;

export function initQuantizeCue(editor) {
  const toggle = document.getElementById('quantize-cue-toggle');
  let enabled = toggle?.checked ?? false;
  let mirror = null;
  let lastDisplayKey = '';
  let missCount = 0;

  void waitForRepl(editor).then((m) => {
    mirror = m;
  });

  function stopLoop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function pollCue() {
    if (!enabled || armed) return;
    try {
      const m = mirror ?? editor.editor;
      if (!m) return;
      const scheduler = getReplScheduler(m);
      const phase = getCyclePhase(scheduler, 1);
      if (!phase) {
        missCount += 1;
        if (missCount >= HIDE_AFTER_MISSES && lastDisplayKey !== '') {
          lastDisplayKey = '';
          updateCueDisplay(null);
        }
        return;
      }

      missCount = 0;
      const key = `${phase.beatInBar}|${Math.round(phase.posInBar * 4)}`;
      if (key === lastDisplayKey) return;
      lastDisplayKey = key;
      updateCueDisplay(phase);
    } catch {
      /* */
    }
  }

  function startLoop() {
    stopLoop();
    if (!enabled) return;
    pollCue();
    intervalId = setInterval(pollCue, POLL_MS);
  }

  toggle?.addEventListener('change', () => {
    enabled = toggle.checked;
    lastDisplayKey = '';
    missCount = 0;
    if (!enabled) {
      stopLoop();
      updateCueDisplay(null);
      return;
    }
    startLoop();
  });

  if (enabled) startLoop();

  return {
    onQuantizeTick(phase) {
      if (!enabled) return;
      const label = document.getElementById('quantize-cue')?.dataset.label || 'DROP';
      updateCueDisplay(phase, label);
      if (phase?.drop) {
        setTimeout(disarmQuantizeCue, 600);
      }
    },
    dispose() {
      stopLoop();
      document.getElementById('quantize-cue')?.remove();
    },
  };
}

export function getQuantizeCueControls() {
  return { armQuantizeCue, disarmQuantizeCue };
}
