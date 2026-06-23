import { getAudioContext } from '@strudel/webaudio';
import { silence } from '@strudel/core';
import { waitForRepl } from './ai-panel.js';
import { getReplScheduler } from './strudel-quantize.js';
import { resetWamAutomation } from './wam-automation.js';
import { stopStemAnalysis } from './stem-analyser.js';
import { stopRaveClient } from './rave-client.js';
import { unloadFaustNode } from './faust-host.js';
import { blackoutHydra } from './hydra-panel.js';
import { getWamAudioContext } from './wam-host.js';
import { getContext } from 'tone';

function collectAudioContexts() {
  const ctx = new Set();
  try {
    const strudel = getAudioContext?.();
    if (strudel) ctx.add(strudel);
  } catch {
    /* not started */
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
  const contexts = collectAudioContexts();

  await Promise.all(contexts.map((c) => c.suspend?.()));

  try {
    const mirror = await waitForRepl(editor);
    mirror?.repl?.stop?.();
    const scheduler = getReplScheduler(mirror);
    scheduler?.stop?.();
    if (mirror?.repl?.setPattern) {
      await mirror.repl.setPattern(silence, false);
    }
    if (mirror?.setCode) {
      mirror.setCode('// PANIC — silence\nsilence');
    }
  } catch {
    /* repl not ready */
  }

  resetWamAutomation();
  stopStemAnalysis();
  stopRaveClient();
  unloadFaustNode();
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

  async function runPanic(source = 'ui') {
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
      if (data.at && data.at > lastRemote) {
        lastRemote = data.at;
        if (Date.now() - data.at < 3000) runPanic('remote');
      }
    } catch {
      /* offline */
    }
  };
  setInterval(pollRemote, 400);

  return { runPanic };
}
