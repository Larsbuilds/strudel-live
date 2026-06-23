import { waitForRepl } from './ai-panel.js';
import { getReplScheduler } from './strudel-quantize.js';
import { setMasterVolume, getMasterBus } from './audio-bus.js';
import { getWamAudioContext } from './wam-host.js';
import { getContext } from 'tone';

/** Stop playback — keeps editor code, turns mic off. No silence flash. */
export async function stopPlayback(editor, hub, { mic = true } = {}) {
  if (hub?.stopPlaybackLocal) {
    await hub.stopPlaybackLocal();
  } else {
    try {
      const mirror = await waitForRepl(editor);
      mirror?.repl?.stop?.();
      getReplScheduler(mirror)?.stop?.();
    } catch {
      /* repl not ready */
    }
  }

  if (mic) {
    const toggle = document.getElementById('mic-toggle');
    if (toggle?.checked) {
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    }
  }

  window.dispatchEvent(new CustomEvent('strudel-live:stop', { detail: { at: Date.now() } }));
  return { ok: true };
}

export function initTransport(editor, hub) {
  const stopBtn = document.getElementById('stop-btn');
  const status = document.getElementById('ai-status');

  stopBtn?.addEventListener('click', async () => {
    stopBtn.disabled = true;
    try {
      await stopPlayback(editor, hub);
      if (status) {
        status.textContent = 'Gestoppt — Basis bleibt im Editor';
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    } finally {
      stopBtn.disabled = false;
    }
  });

  window.addEventListener('strudel-live:panic', () => {
    if (status) status.textContent = '';
  });
}

export function applyMasterGain(value) {
  const gain = Math.max(0, Math.min(1.5, value));
  const contexts = [];
  try {
    const wam = getWamAudioContext();
    if (wam) contexts.push(wam);
  } catch {
    /* */
  }
  try {
    const tone = getContext()?.rawContext;
    if (tone) contexts.push(tone);
  } catch {
    /* */
  }
  const editor = document.getElementById('repl');
  if (editor?.editor) {
    const strudel =
      editor.editor?.repl?.audio?.audioContext ||
      editor.editor?.repl?.scheduler?.audioContext ||
      editor.editor?.audioContext;
    if (strudel) contexts.push(strudel);
  }
  for (const ctx of contexts) {
    setMasterVolume(gain, ctx);
    const bus = getMasterBus(ctx);
    if (bus) bus.gain.value = gain;
  }
  return gain;
}
