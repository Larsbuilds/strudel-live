import { waitForRepl } from './ai-panel.js';
import { getReplScheduler } from './strudel-quantize.js';
import { resetWamAutomation } from './wam-automation.js';
import { stopStemAnalysis } from './stem-analyser.js';
import { stopRaveClient } from './rave-client.js';
import { unloadFaustNode } from './faust-host.js';
import { getWamAudioContext } from './wam-host.js';
import { getContext } from 'tone';

async function collectAudioContexts(editor) {
  const ctx = new Set();
  try {
    const mirror = await waitForRepl(editor);
    const strudel =
      mirror?.repl?.audio?.audioContext ||
      mirror?.repl?.scheduler?.audioContext ||
      mirror?.audioContext;
    if (strudel) ctx.add(strudel);
  } catch {
    /* repl not ready */
  }
  try {
    const wam = getWamAudioContext();
    if (wam) ctx.add(wam);
  } catch {
    /* */
  }
  try {
    const tone = getContext()?.rawContext;
    if (tone) ctx.add(tone);
  } catch {
    /* */
  }
  return [...ctx];
}

export async function executePanic(editor) {
  const contexts = await collectAudioContexts(editor);

  await Promise.all(contexts.map((c) => c.suspend?.()));

  try {
    const mirror = await waitForRepl(editor);
    mirror?.repl?.stop?.();
    const scheduler = getReplScheduler(mirror);
    scheduler?.stop?.();
    if (mirror?.setCode) {
      mirror.setCode('// PANIC — silence\nsilence');
    } else if (mirror?.repl?.evaluate) {
      await mirror.repl.evaluate('silence', false);
    }
  } catch {
    /* repl not ready */
  }

  resetWamAutomation();
  stopStemAnalysis();
  stopRaveClient();
  unloadFaustNode();
  const { blackoutHydra } = await import('./visuals-panel.js');
  blackoutHydra();

  const micToggle = document.getElementById('mic-toggle');
  if (micToggle?.checked) {
    micToggle.checked = false;
    micToggle.dispatchEvent(new Event('change'));
  }

  await Promise.all(contexts.map((c) => c.resume?.()));

  window.dispatchEvent(new CustomEvent('strudel-live:panic', { detail: { at: Date.now() } }));
  return { ok: true };
}

export function initPanicButton(editor) {
  const btn = document.getElementById('panic-btn');
  const status = document.getElementById('panic-status');
  let running = false;

  async function runPanic(source = 'ui') {
    if (running) return;
    running = true;
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'NOT-AUS…';
    try {
      await executePanic(editor);
      if (status) {
        status.textContent = `Stille (${source}) — Strudel reset · Hydra schwarz`;
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    } finally {
      if (btn) btn.disabled = false;
      running = false;
    }
  }

  btn?.addEventListener('click', () => runPanic('ui'));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runPanic('keyboard');
    }
  });

  let lastRemote = 0;
  const pollRemote = async () => {
    try {
      const res = await fetch('/api/panic');
      const data = await res.json();
      if (!data.at || data.at <= lastRemote) return;
      lastRemote = data.at;
      if (Date.now() - data.at < 3000) runPanic('remote');
    } catch {
      /* offline */
    }
  };
  const pollId = setInterval(pollRemote, 3000);

  return {
    runPanic,
    dispose() {
      clearInterval(pollId);
    },
  };
}
