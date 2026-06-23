import { stemLevelsForPrompt } from './stem-analyser.js';
import { applyWamAutomation } from './wam-automation.js';
import { waitForQuantizedBoundary, getReplScheduler } from './strudel-quantize.js';
import { waitForRepl } from './ai-panel.js';
import { armQuantizeCue, disarmQuantizeCue } from './quantize-cue.js';

let cueOnTick = null;

export function setQuantizeCueHandler(handler) {
  cueOnTick = handler;
}

async function applyConductorOutputs({ hub, editor, data, prompt, hydraCodeEl, status }) {
  const mirror = await waitForRepl(editor);
  const scheduler = getReplScheduler(mirror);

  armQuantizeCue('DROP');
  if (status) status.textContent = 'Armed — Countdown bis DROP…';

  const quant = await waitForQuantizedBoundary(scheduler, 1, {
    onTick: (phase) => cueOnTick?.(phase),
  });
  disarmQuantizeCue();

  await hub.applyPattern(data.strudel, {
    prompt,
    scale: data.scale,
    source: 'conductor',
    quantize: false,
  });

  if (data.hydra && hydraCodeEl) {
    hydraCodeEl.value = data.hydra;
    const wrap = document.getElementById('hydra-canvas-wrap');
    if (wrap?.hidden) {
      document.getElementById('hydra-start')?.click();
      await new Promise((r) => setTimeout(r, 400));
    }
    document.getElementById('hydra-run')?.click();
  }

  const wamResult = applyWamAutomation(data.wam);

  if (status) {
    status.dataset.state = 'ok';
    const q = quant.quantized ? ` · quantisiert (+${quant.waitedMs}ms)` : '';
    status.textContent = `Conductor — ${data.provider}/${data.model}${q}${wamResult.applied ? ` · WAM: ${wamResult.names.join(', ')}` : ''}`;
  }
  document.getElementById('save-pattern-btn').disabled = false;
}

export function initConductorPanel({ hub, editor }) {
  const form = document.getElementById('conductor-form');
  const promptEl = document.getElementById('conductor-prompt');
  const status = document.getElementById('conductor-status');
  const hydraCodeEl = document.getElementById('hydra-code');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptEl?.value?.trim();
    if (!prompt) return;

    const { session } = await import('./session.js');
    const fromTrack = session.selectedTrack;

    if (status) {
      status.dataset.state = 'loading';
      status.textContent = 'AI Conductor orchestriert — warte auf nächste Eins…';
    }

    try {
      const res = await fetch('/api/conduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          fromTrack,
          stemLevels: stemLevelsForPrompt(),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      await applyConductorOutputs({ hub, editor, data, prompt, hydraCodeEl, status });
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = err.message;
      }
    }
  });
}
