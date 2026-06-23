import { initHydra, clearHydra } from '@strudel/hydra';
import { session } from './session.js';

let hydraReady = false;

export function initHydraPanel() {
  const startBtn = document.getElementById('hydra-start');
  const runBtn = document.getElementById('hydra-run');
  const genBtn = document.getElementById('hydra-generate');
  const codeEl = document.getElementById('hydra-code');
  const promptEl = document.getElementById('hydra-prompt');
  const canvasWrap = document.getElementById('hydra-canvas-wrap');
  const status = document.getElementById('hydra-status');

  startBtn?.addEventListener('click', async () => {
    try {
      await initHydra({
        detectAudio: true,
        feedStrudel: true,
        pixelated: false,
      });
      hydraReady = true;
      if (canvasWrap) canvasWrap.hidden = false;
      if (status) {
        status.textContent = 'Hydra aktiv — Audio-reaktiv + Strudel-Feed';
        status.dataset.state = 'ok';
      }
      runHydraCode(codeEl?.value || 'osc(10,0.1).color(1,0.2,0.5).out()', status);
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    }
  });

  runBtn?.addEventListener('click', () => {
    if (!hydraReady) {
      if (status) status.textContent = 'Erst Hydra starten';
      return;
    }
    runHydraCode(codeEl?.value, status);
  });

  genBtn?.addEventListener('click', async () => {
    const prompt = promptEl?.value?.trim() || buildVisualPromptFromSession();
    if (status) status.textContent = 'KI generiert Visuals…';
    try {
      const res = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (codeEl) codeEl.value = data.code;
      if (!hydraReady) startBtn?.click();
      else runHydraCode(data.code, status);
      if (status) {
        status.textContent = `Visuals — ${data.provider}/${data.model}`;
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    }
  });

  window.addEventListener('strudel-live:pattern', (e) => {
    const auto = document.getElementById('hydra-auto');
    if (!auto?.checked || !hydraReady) return;
    const hint = buildVisualPromptFromSession(e.detail);
    if (promptEl && !promptEl.value.trim()) promptEl.value = hint;
  });
}

function buildVisualPromptFromSession(detail = {}) {
  const key = detail?.scale?.label || session.lastScale?.label || '';
  const src = detail?.source || 'live';
  return `audio-reactive visuals for ${src} set${key ? ` in ${key}` : ''}, techno energy, dark colors`;
}

function runHydraCode(code, status) {
  if (!code?.trim()) return;
  try {
    // eslint-disable-next-line no-eval
    eval(code.trim());
    if (status) status.dataset.state = 'ok';
  } catch (err) {
    if (status) {
      status.textContent = `Hydra-Fehler: ${err.message}`;
      status.dataset.state = 'error';
    }
  }
}

export { clearHydra };
