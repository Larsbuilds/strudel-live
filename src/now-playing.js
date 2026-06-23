import { labelForPattern } from './pattern-labels.js';

const BADGE = {
  preset: 'Basis-Beat',
  picker: 'Basis-Beat',
  ai: 'KI',
  ignite: 'KI Ignite',
};

/** Shows what is currently playing and lets the user stop it. */
export function initNowPlaying(editor, hub) {
  const bar = document.getElementById('now-playing');
  const badge = document.getElementById('now-playing-badge');
  const label = document.getElementById('now-playing-label');
  const stopBtn = document.getElementById('now-playing-stop');

  function show(meta = {}) {
    if (!bar) return;
    const src = meta.source || 'picker';
    if (badge) badge.textContent = BADGE[src] || src;
    if (label) {
      label.textContent = meta.name
        ? labelForPattern(meta.name)
        : meta.prompt?.slice(0, 60) || 'Pattern läuft';
    }
    bar.hidden = false;
    bar.dataset.source = src;
  }

  function hide() {
    if (bar) bar.hidden = true;
  }

  window.addEventListener('strudel-live:pattern', (e) => {
    const d = e.detail || {};
    show({ source: d.source, name: d.name, prompt: d.prompt });
  });

  window.addEventListener('strudel-live:stop', hide);
  window.addEventListener('strudel-live:panic', hide);
  window.addEventListener('strudel-live:pattern-clear', hide);

  stopBtn?.addEventListener('click', async () => {
    const { stopPlayback } = await import('./transport.js');
    await stopPlayback(editor, hub);
    hide();
    const picker = document.getElementById('pattern-picker');
    if (picker) picker.value = '';
  });

  return { show, hide };
}
