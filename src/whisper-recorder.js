import { getPromptVoiceUi } from './prompt-voice-ui.js';

let mediaRecorder = null;
let chunks = [];
let recording = false;
let levelRaf = null;
let levelCtx = null;

export function initWhisperRecorder({ promptInput, onTranscript }) {
  const btn = document.getElementById('whisper-btn');
  const ui = getPromptVoiceUi();
  if (!btn) return;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    btn.disabled = true;
    btn.title = 'MediaRecorder nicht unterstützt';
    return;
  }

  window.addEventListener('strudel-live:stop', () => {
    if (recording) mediaRecorder?.stop();
    ui.clear();
  });

  btn.addEventListener('click', async () => {
    if (recording) {
      mediaRecorder?.stop();
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent('strudel-live:voice-start'));
      if (promptInput) promptInput.value = '';
      ui.clear();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        recording = false;
        stopLevelMeter(ui);
        btn.textContent = '🎙 Whisper';
        btn.classList.remove('listening');
        ui.setListening(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        await sendToWhisper(blob, { promptInput, onTranscript, ui });
      };
      mediaRecorder.start();
      recording = true;
      btn.textContent = '⏹ Aufnahme stoppen';
      btn.classList.add('listening');
      ui.setListening(true);
      ui.showRecording(true);
      startLevelMeter(stream, ui);
    } catch (err) {
      ui.clear();
      if (promptInput) promptInput.placeholder = err.message;
    }
  });
}

function startLevelMeter(stream, ui) {
  levelCtx = new AudioContext();
  const src = levelCtx.createMediaStreamSource(stream);
  const analyser = levelCtx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const level = Math.min(1, sum / data.length / 100);
    ui.setLevel01(level);
    levelRaf = requestAnimationFrame(tick);
  };
  tick();
}

function stopLevelMeter(ui) {
  if (levelRaf) cancelAnimationFrame(levelRaf);
  levelRaf = null;
  if (levelCtx?.state !== 'closed') levelCtx?.close();
  levelCtx = null;
  ui.showRecording(false);
  ui.setLevel01(0);
}

function pickMimeType() {
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

async function sendToWhisper(blob, { promptInput, onTranscript, ui }) {
  ui.setInterim('Transkribiere…');
  const audioBase64 = await blobToBase64(blob);

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType: blob.type }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Transcription failed');

  promptInput.value = data.text;
  ui.clear();
  onTranscript?.(data.text);
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
