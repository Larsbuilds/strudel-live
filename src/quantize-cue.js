import { waitForRepl } from './ai-panel.js';
import { getCyclePhase, getReplScheduler } from './strudel-quantize.js';

let rafId = null;
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

function setBeatPulse(phase) {
  if (!phase) {
    document.body.style.removeProperty('--beat-phase');
    return;
  }
  document.body.style.setProperty('--beat-phase', String(phase.posInBar));
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
    el.classList.add('quantize-cue--drop');
    count.textContent = 'DROP';
    return;
  }

  if (armed) {
    el.classList.add('quantize-cue--armed', 'quantize-cue--active');
    const n = phase.beatsUntilDrop;
    count.textContent = n <= 1 ? '1' : String(n);
  } else {
    el.classList.add('quantize-cue--active');
    el.classList.remove('quantize-cue--armed');
    count.textContent = String(phase.beatInBar + 1);
  }

  setBeatPulse(phase);
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

export function initQuantizeCue(editor) {
  const toggle = document.getElementById('quantize-cue-toggle');
  let enabled = toggle?.checked ?? true;

  toggle?.addEventListener('change', () => {
    enabled = toggle.checked;
    if (!enabled) updateCueDisplay(null);
  });

  const tick = async () => {
    if (!enabled) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    try {
      const mirror = await waitForRepl(editor);
      const scheduler = getReplScheduler(mirror);
      const phase = getCyclePhase(scheduler, 1);
      if (phase && !armed) updateCueDisplay(phase);
      else if (!phase && !armed) updateCueDisplay(null);
    } catch {
      /* */
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    onQuantizeTick(phase) {
      if (!enabled) return;
      const label = document.getElementById('quantize-cue')?.dataset.label || 'DROP';
      updateCueDisplay(phase, label);
      if (phase?.drop) {
        setTimeout(disarmQuantizeCue, 600);
        return;
      }
    },
  };
}

export function getQuantizeCueControls() {
  return { armQuantizeCue, disarmQuantizeCue };
}
