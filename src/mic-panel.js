import { UserMedia, PitchShift, getDestination, getContext } from 'tone';
import { PitchDetector } from 'pitchy';
import { session } from './session.js';
import { snapMidiToScale, freqToMidi } from './scale-utils.js';

let micStream = null;
let micContext = null;
let sourceNode = null;
let monitorGain = null;
let toneMic = null;
let pitchShift = null;
let analyser = null;
let detector = null;
let rafId = null;

export function initMicPanel() {
  const toggle = document.getElementById('mic-toggle');
  const modeSelect = document.getElementById('mic-mode');
  const status = document.getElementById('mic-status');
  const keyLabel = document.getElementById('mic-key-label');
  if (!toggle || !status) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Mikrofon nicht unterstützt.';
    toggle.disabled = true;
    return;
  }

  modeSelect?.addEventListener('change', async () => {
    if (!toggle.checked) return;
    stopMic();
    try {
      await startMic(modeSelect.value, status, keyLabel);
    } catch (err) {
      toggle.checked = false;
      status.textContent = err.message;
      status.dataset.state = 'error';
    }
  });

  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      try {
        await startMic(modeSelect?.value || 'monitor', status, keyLabel);
      } catch (err) {
        toggle.checked = false;
        status.textContent = err.message || 'Mikrofon-Zugriff verweigert.';
        status.dataset.state = 'error';
      }
    } else {
      stopMic();
      status.textContent = 'Mikrofon aus.';
      status.dataset.state = '';
      if (keyLabel) keyLabel.textContent = '';
    }
  });

  setInterval(() => {
    if (keyLabel && session.lastScale && toggle.checked && modeSelect?.value === 'keysync') {
      keyLabel.textContent = `Key-Sync: ${session.lastScale.label}`;
    }
  }, 1500);
}

async function startMic(selectedMode, status, keyLabel) {
  stopMic();

  if (selectedMode === 'monitor') {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    micContext = new AudioContext();
    sourceNode = micContext.createMediaStreamSource(micStream);
    monitorGain = micContext.createGain();
    monitorGain.gain.value = 0.7;
    sourceNode.connect(monitorGain).connect(micContext.destination);
    if (micContext.state === 'suspended') await micContext.resume();
    status.textContent = 'Monitor aktiv.';
    status.dataset.state = 'ok';
    return;
  }

  await getContext().resume();
  toneMic = new UserMedia();
  await toneMic.open();
  micStream = toneMic.mediaStream;

  pitchShift = new PitchShift({ pitch: 0, windowSize: 0.12 }).connect(getDestination());
  toneMic.connect(pitchShift);

  const raw = getContext().rawContext;
  analyser = raw.createAnalyser();
  analyser.fftSize = 2048;
  const tap = raw.createMediaStreamSource(micStream);
  tap.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  detector = PitchDetector.forFloat32Array(analyser.fftSize);

  const tick = () => {
    analyser.getFloatTimeDomainData(buffer);
    const [freq, clarity] = detector.findPitch(buffer, raw.sampleRate);
    if (clarity > 0.82 && freq > 65) {
      applyCorrection(freq, selectedMode);
    }
    rafId = requestAnimationFrame(tick);
  };
  tick();

  if (selectedMode === 'keysync') {
    status.textContent = session.lastScale
      ? `Key-Sync aktiv → ${session.lastScale.label}`
      : 'Key-Sync aktiv — generiere zuerst ein Pattern mit .scale()';
  } else {
    status.textContent = 'Autotune aktiv (chromatisch).';
  }
  status.dataset.state = 'ok';
}

function applyCorrection(freq, mode) {
  const midi = freqToMidi(freq);
  if (midi == null || !pitchShift) return;
  let target = mode === 'autotune' ? Math.round(midi) : midi;
  if (mode === 'keysync' && session.lastScale) {
    target = snapMidiToScale(midi, session.lastScale);
  }
  const semitones = Math.max(-12, Math.min(12, target - midi));
  pitchShift.pitch = semitones;
}

function stopMic() {
  cancelAnimationFrame(rafId);
  rafId = null;
  micStream?.getTracks().forEach((t) => t.stop());
  toneMic?.close();
  toneMic?.dispose();
  pitchShift?.dispose();
  sourceNode?.disconnect();
  monitorGain?.disconnect();
  analyser?.disconnect();
  if (micContext && micContext.state !== 'closed') micContext.close();
  micStream = null;
  micContext = null;
  sourceNode = null;
  monitorGain = null;
  toneMic = null;
  pitchShift = null;
  analyser = null;
  detector = null;
}
