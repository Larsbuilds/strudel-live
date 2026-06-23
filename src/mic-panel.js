/**
 * Mikrofon-Monitor — Phase 6 Vorbereitung (Autotune/Key-Sync kommt später).
 * Pass-through deines Mic-Signals parallel zum Strudel-Output.
 */

let micStream = null;
let micContext = null;
let micNodes = null;

export function initMicPanel() {
  const toggle = document.getElementById('mic-toggle');
  const status = document.getElementById('mic-status');
  if (!toggle || !status) return;

  const supported = Boolean(navigator.mediaDevices?.getUserMedia);
  if (!supported) {
    status.textContent = 'Mikrofon nicht unterstützt in diesem Browser.';
    toggle.disabled = true;
    return;
  }

  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      try {
        await startMicMonitor();
        status.textContent = 'Mikrofon aktiv — Monitor läuft. Autotune: Phase 6 (docs/ROADMAP.md).';
        status.dataset.state = 'ok';
      } catch (err) {
        toggle.checked = false;
        status.textContent = err.message || 'Mikrofon-Zugriff verweigert.';
        status.dataset.state = 'error';
      }
    } else {
      stopMicMonitor();
      status.textContent = 'Mikrofon aus.';
      status.dataset.state = '';
    }
  });
}

async function startMicMonitor() {
  stopMicMonitor();
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  micContext = new AudioContext();
  const source = micContext.createMediaStreamSource(micStream);
  const gain = micContext.createGain();
  gain.gain.value = 0.75;
  source.connect(gain).connect(micContext.destination);
  micNodes = { source, gain };
  if (micContext.state === 'suspended') await micContext.resume();
}

function stopMicMonitor() {
  micStream?.getTracks().forEach((t) => t.stop());
  micContext?.close();
  micStream = null;
  micContext = null;
  micNodes = null;
}
