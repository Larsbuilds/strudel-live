/** Visual presets + embedded stage above the Strudel editor. */
import { initHydra } from '@strudel/hydra';

export const VISUAL_PRESETS = [
  {
    id: 'techno-red',
    label: 'Techno Rot',
    code: 'osc(12,0.08,1.2).color(1,0.12,0.2).rotate(0.08,0.04).out()',
  },
  {
    id: 'club-strobe',
    label: 'Strobe',
    code: 'osc(30,0.02).modulate(noise(3),0.3).color(1,0.3,0.1).contrast(1.8).out()',
  },
  {
    id: 'ambient-blue',
    label: 'Ambient',
    code: 'gradient(2).color(0.08,0.15,0.45).hue(0.05).saturate(1.2).out()',
  },
  {
    id: 'kaleido',
    label: 'Kaleido',
    code: 'osc(18,0.02).kaleid(5).color(0.7,0.2,0.6).rotate(0.1,0.02).out()',
  },
  {
    id: 'noise-pulse',
    label: 'Noise',
    code: 'noise(4).modulateScale(osc(4),0.4).color(1,0.45,0.15).contrast(1.4).out()',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    code: 'solid(0.04,0.04,0.06).add(osc(6,0.01).color(0.3,0.3,0.5),0.15).out()',
  },
];

let hydraReady = false;
let canvasObserver = null;

function mountCanvasInStage() {
  const stage = document.getElementById('visual-stage');
  const canvas = document.getElementById('hydra-canvas') || document.getElementById('test-canvas');
  if (stage && canvas && canvas.parentElement !== stage) {
    stage.appendChild(canvas);
  }
}

function watchCanvas() {
  if (canvasObserver) return;
  canvasObserver = new MutationObserver(() => mountCanvasInStage());
  canvasObserver.observe(document.body, { childList: true, subtree: true });
  mountCanvasInStage();
}

async function ensureHydra() {
  if (hydraReady) return;
  await initHydra({ detectAudio: true, feedStrudel: true, pixelated: false });
  hydraReady = true;
  watchCanvas();
  const placeholder = document.getElementById('visual-stage-placeholder');
  if (placeholder) placeholder.hidden = true;
}

function runVisualCode(code) {
  if (!code?.trim()) return;
  // eslint-disable-next-line no-eval
  eval(code.trim());
}

export async function applyVisualPreset(presetId) {
  if (presetId === 'off') {
    blackoutHydra();
    return;
  }
  const preset = VISUAL_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  await ensureHydra();
  runVisualCode(preset.code);
  const select = document.getElementById('visual-preset-select');
  if (select) select.value = presetId;
  const status = document.getElementById('visual-status');
  if (status) {
    status.textContent = preset.label;
    status.dataset.state = 'ok';
  }
}

export async function runHydraFromIgnite(code) {
  if (!code?.trim()) {
    await applyVisualPreset('techno-red');
    return;
  }
  await ensureHydra();
  runVisualCode(code);
}

export function initVisualsPanel() {
  const stage = document.getElementById('visual-stage');
  const chips = document.getElementById('visual-preset-chips');
  const select = document.getElementById('visual-preset-select');
  const fullscreenBtn = document.getElementById('visual-fullscreen-btn');
  const status = document.getElementById('visual-status');

  if (!stage) return;

  for (const preset of VISUAL_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'visual-chip';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => applyVisualPreset(preset.id));
    chips?.append(btn);

    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = preset.label;
    select?.append(opt);
  }

  const offOpt = document.createElement('option');
  offOpt.value = 'off';
  offOpt.textContent = 'Aus';
  select?.append(offOpt);

  select?.addEventListener('change', () => {
    if (select.value === 'off') {
      blackoutHydra();
      if (status) status.textContent = 'Aus';
      return;
    }
    applyVisualPreset(select.value);
  });

  fullscreenBtn?.addEventListener('click', () => {
    const on = document.body.classList.toggle('visual-fullscreen');
    fullscreenBtn.textContent = on ? '⊟ Verkleinern' : '⊞ Vollbild';
  });

  document.getElementById('ignite-hydra-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked) applyVisualPreset('techno-red');
  });

  window.addEventListener('strudel-live:pattern', () => {
    const auto = document.getElementById('ignite-hydra-toggle');
    if (auto?.checked && !hydraReady) applyVisualPreset('techno-red');
  });
}

export function blackoutHydra() {
  if (!hydraReady) return;
  try {
    // eslint-disable-next-line no-eval
    eval('solid(0,0,0).out()');
  } catch {
    /* */
  }
}
