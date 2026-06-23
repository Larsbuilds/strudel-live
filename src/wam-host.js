import { WAM_PLUGINS } from './wam-registry.js';

let audioContext = null;
let currentWam = null;
let currentGui = null;

export function initWamHost() {
  const select = document.getElementById('wam-plugin-select');
  const loadBtn = document.getElementById('wam-load-btn');
  const container = document.getElementById('wam-gui-container');
  const status = document.getElementById('wam-status');
  if (!select || !loadBtn) return;

  for (const p of WAM_PLUGINS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.description}`;
    select.append(opt);
  }

  loadBtn.addEventListener('click', async () => {
    const plugin = WAM_PLUGINS.find((p) => p.id === select.value);
    if (!plugin) return;

    if (status) {
      status.textContent = `Lade ${plugin.name}…`;
      status.dataset.state = 'loading';
    }
    loadBtn.disabled = true;

    try {
      await unloadWam(container);
      audioContext = audioContext || new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();

      const imported = await import(/* @vite-ignore */ plugin.url);
      const WAM = imported.default;
      if (!WAM?.createInstance) {
        throw new Error('Kein gültiges WAM-Modul — URL prüfen oder Chrome nutzen');
      }

      currentWam = await WAM.createInstance(audioContext, {});
      const node = currentWam.audioNode;
      if (node) node.connect(audioContext.destination);

      if (currentWam.createGui && container) {
        currentGui = await currentWam.createGui();
        container.innerHTML = '';
        container.append(currentGui);
      }

      if (status) {
        status.textContent = `${plugin.name} geladen — spiele MIDI oder nutze GUI`;
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = `WAM: ${err.message} — siehe docs/SOUND-VISION.md`;
        status.dataset.state = 'error';
      }
    } finally {
      loadBtn.disabled = false;
    }
  });
}

async function unloadWam(container) {
  currentGui?.remove?.();
  currentGui = null;
  if (currentWam?.destroy) await currentWam.destroy();
  currentWam = null;
  if (container) container.innerHTML = '';
}

export function getWamAudioContext() {
  return audioContext;
}
