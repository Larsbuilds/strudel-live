import { applyWamAutomation } from './wam-automation.js';
import { startStemAnalysis } from './stem-analyser.js';
import { startRaveClient } from './rave-client.js';
import { session } from './session.js';

async function enableMic(mode) {
  const toggle = document.getElementById('mic-toggle');
  const modeSelect = document.getElementById('mic-mode');
  if (!toggle || !modeSelect) return;
  modeSelect.value = mode || 'keysync';
  if (!toggle.checked) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
  }
}

async function bootHydra(hydraCode) {
  const wrap = document.getElementById('hydra-canvas-wrap');
  if (wrap?.hidden) {
    document.getElementById('hydra-start')?.click();
    await new Promise((r) => setTimeout(r, 500));
  }
  const codeEl = document.getElementById('hydra-code');
  if (codeEl && hydraCode) codeEl.value = hydraCode;
  document.getElementById('hydra-run')?.click();
}

export async function executeIgniteManifest(manifest, { hub, editor }) {
  const { setup, initial_states: states, summary } = manifest;
  const mods = setup?.modules || {};
  const steps = [];

  const cueToggle = document.getElementById('quantize-cue-toggle');
  if (cueToggle) cueToggle.checked = setup?.routing?.quantizeCue !== false;

  if (mods.stems && session.selectedTrack) {
    try {
      const loaded = await startStemAnalysis(session.selectedTrack);
      steps.push(`stems: ${loaded.join(', ')}`);
    } catch (err) {
      steps.push(`stems: ${err.message}`);
    }
  }

  if (mods.hydra && states.hydra) {
    await bootHydra(states.hydra);
    steps.push('hydra');
  }

  if (mods.mic) {
    await enableMic(mods.micMode);
    steps.push(`mic:${mods.micMode}`);
  }

  if (mods.rave) {
    try {
      await startRaveClient(512);
      steps.push('rave');
    } catch (err) {
      steps.push(`rave: ${err.message}`);
    }
  }

  if (mods.wam) {
    const wamSelect = document.getElementById('wam-plugin-select');
    if (wamSelect && !wamSelect.value) wamSelect.selectedIndex = 0;
    document.getElementById('wam-load-btn')?.click();
    steps.push('wam');
    await new Promise((r) => setTimeout(r, 800));
    if (states.wam) applyWamAutomation(states.wam);
  }

  await hub.applyPattern(states.strudel, {
    prompt: summary,
    scale: manifest.scale,
    source: 'ignite',
    quantize: false,
  });

  return { steps, summary };
}

export async function runIgnite({ prompt, hub, editor, statusEl }) {
  const trackContext =
    document.getElementById('dj-context-mode')?.checked && session.selectedTrack
      ? session.selectedTrack
      : session.selectedTrack?.stemsReady
        ? session.selectedTrack
        : undefined;

  if (statusEl) {
    statusEl.dataset.state = 'loading';
    statusEl.textContent = 'Ignite — KI plant Session…';
  }

  const res = await fetch('/api/ignite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, trackContext }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);

  if (statusEl) statusEl.textContent = `${data.summary} — starte Module…`;

  const result = await executeIgniteManifest(data, { hub, editor });

  const fixNote =
    data.constraints?.fixes?.length > 0 ? ` · Constraints: ${data.constraints.fixes.join(', ')}` : '';

  if (statusEl) {
    statusEl.dataset.state = 'ok';
    statusEl.textContent = `Ignite — ${result.summary} (${result.steps.join(', ')})${fixNote}`;
  }

  document.getElementById('save-pattern-btn').disabled = false;
  return data;
}
