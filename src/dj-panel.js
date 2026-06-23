import { applyCodeToRepl } from './ai-panel.js';
import { setLastPattern } from './session.js';
import { parseScaleFromCode } from './scale-utils.js';

export async function initDjPanel({ editor }) {
  const trackSelect = document.getElementById('dj-track-select');
  const trackMeta = document.getElementById('dj-track-meta');
  const refreshBtn = document.getElementById('dj-manifest-refresh');
  const transitionForm = document.getElementById('dj-transition-form');
  const toPrompt = document.getElementById('dj-to-prompt');
  const status = document.getElementById('dj-status');

  let manifest = { tracks: {} };
  let selectedTrack = null;

  async function loadManifest() {
    try {
      const res = await fetch('/api/dj/manifest');
      const data = await res.json();
      manifest = data.manifest || { tracks: {} };
      renderTracks();
    } catch (err) {
      if (status) status.textContent = `Manifest: ${err.message}`;
    }
  }

  function renderTracks() {
    if (!trackSelect) return;
    const ids = Object.keys(manifest.tracks);
    trackSelect.innerHTML = '<option value="">— Track wählen —</option>';
    for (const id of ids) {
      const t = manifest.tracks[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${t.name || id}${t.bpm ? ` (${t.bpm} BPM)` : ''}`;
      trackSelect.append(opt);
    }
    if (ids.length === 0 && trackMeta) {
      trackMeta.textContent =
        'Keine Tracks — npm run sc:fetch -- --url "https://soundcloud.com/..."';
    }
  }

  trackSelect?.addEventListener('change', () => {
    selectedTrack = manifest.tracks[trackSelect.value] || null;
    if (!trackMeta) return;
    if (!selectedTrack) {
      trackMeta.textContent = '';
      return;
    }
    trackMeta.textContent = JSON.stringify(selectedTrack, null, 2);
  });

  refreshBtn?.addEventListener('click', loadManifest);

  transitionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = toPrompt?.value?.trim();
    if (!prompt) return;
    if (!selectedTrack) {
      if (status) status.textContent = 'Erst einen Track aus dem Manifest wählen.';
      return;
    }

    if (status) {
      status.dataset.state = 'loading';
      status.textContent = 'KI baut Übergangs-Pattern…';
    }

    try {
      const res = await fetch('/api/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTrack: selectedTrack,
          toPrompt: prompt,
          bars: 16,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const scale = data.scale ?? parseScaleFromCode(data.code);
      setLastPattern({ code: data.code, prompt, scale });
      await applyCodeToRepl(editor, data.code);
      if (status) {
        status.dataset.state = 'ok';
        status.textContent = `Übergang läuft — ${data.provider}/${data.model}`;
      }
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = err.message;
      }
    }
  });

  await loadManifest();
}
