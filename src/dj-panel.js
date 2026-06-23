import { setSelectedTrack } from './session.js';

export async function initDjPanel({ hub }) {
  const trackSelect = document.getElementById('dj-track-select');
  const trackMeta = document.getElementById('dj-track-meta');
  const refreshBtn = document.getElementById('dj-manifest-refresh');
  const transitionForm = document.getElementById('dj-transition-form');
  const toPrompt = document.getElementById('dj-to-prompt');
  const status = document.getElementById('dj-status');

  let manifest = { tracks: {} };

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
      trackMeta.textContent = 'Keine Tracks — npm run sc:fetch -- --url "…"';
    }
  }

  trackSelect?.addEventListener('change', () => {
    const track = manifest.tracks[trackSelect.value] || null;
    setSelectedTrack(track);
    if (!trackMeta) return;
    trackMeta.textContent = track ? JSON.stringify(track, null, 2) : '';
  });

  refreshBtn?.addEventListener('click', loadManifest);

  transitionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = toPrompt?.value?.trim();
    const selectedTrack = manifest.tracks[trackSelect?.value];
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
        body: JSON.stringify({ fromTrack: selectedTrack, toPrompt: prompt, bars: 16 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      await hub.applyPattern(data.code, {
        prompt,
        scale: data.scale,
        source: 'transition',
      });
      if (status) {
        status.dataset.state = 'ok';
        status.textContent = `Übergang läuft — ${data.provider}/${data.model}`;
      }
      document.getElementById('save-pattern-btn').disabled = false;
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = err.message;
      }
    }
  });

  await loadManifest();
}
