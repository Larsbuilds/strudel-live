import { waitForRepl } from './ai-panel.js';

const POLL_MS = 150;
const BPM_EPS = 0.25;

let timer = null;
let lastAppliedCpm = null;
let editorRef = null;

function patchSetcpm(code, cpm) {
  const rounded = Math.round(cpm * 100) / 100;
  if (/setcpm\s*\(/i.test(code)) {
    return code.replace(/setcpm\s*\(\s*[\d.]+\s*\)/i, `setcpm(${rounded})`);
  }
  return `setcpm(${rounded})\n${code}`;
}

async function applyLinkCpm(bpm, editor) {
  if (!editor?.editor || !Number.isFinite(bpm)) return;
  const cpm = bpm / 4;
  if (lastAppliedCpm !== null && Math.abs(lastAppliedCpm - cpm) < BPM_EPS / 4) return;

  const code = editor.editor.code || '';
  if (!code.trim()) return;

  const next = patchSetcpm(code, cpm);
  if (next === code) return;

  editor.editor.setCode(next);
  const mirror = await waitForRepl(editor);
  await mirror.evaluate();
  lastAppliedCpm = cpm;
}

function formatBeat(beat) {
  const bar = Math.floor(beat / 4) + 1;
  const beatInBar = (Math.floor(beat) % 4) + 1;
  return `${bar}.${beatInBar}`;
}

export function initLinkSync(editor) {
  editorRef = editor;
  const toggle = document.getElementById('link-sync-toggle');
  const status = document.getElementById('link-status');

  if (!toggle || !status) return;

  async function poll() {
    try {
      const res = await fetch('/api/link');
      const data = await res.json();
      if (!data.ok) {
        status.textContent = 'Link: —';
        return;
      }

      const { available, enabled, bpm, beat, error } = data;
      if (!available) {
        status.textContent = error ? `Link: ${error}` : 'Link: nicht verfügbar';
        status.classList.remove('link-status--live');
        return;
      }

      status.classList.add('link-status--live');
      status.textContent = enabled
        ? `Link ${Math.round(bpm)} BPM · Takt ${formatBeat(beat)}`
        : `Link bereit · ${Math.round(bpm)} BPM`;

      if (toggle.checked && enabled) {
        await applyLinkCpm(bpm, editorRef);
      }
    } catch {
      status.textContent = 'Link: offline';
      status.classList.remove('link-status--live');
    }
  }

  function start() {
    if (timer) return;
    poll();
    timer = setInterval(poll, POLL_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  toggle.addEventListener('change', () => {
    lastAppliedCpm = null;
    if (toggle.checked) start();
    else stop();
  });

  start();
}
