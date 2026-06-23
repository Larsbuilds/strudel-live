let mediaRecorder = null;
let chunks = [];
let recording = false;

export function initWhisperRecorder({ promptInput, onTranscript, statusEl }) {
  const btn = document.getElementById('whisper-btn');
  if (!btn) return;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    btn.disabled = true;
    btn.title = 'MediaRecorder nicht unterstützt';
    return;
  }

  btn.addEventListener('click', async () => {
    if (recording) {
      mediaRecorder?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        recording = false;
        btn.textContent = '🎙 Whisper';
        btn.classList.remove('listening');
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        await sendToWhisper(blob, { promptInput, onTranscript, statusEl });
      };
      mediaRecorder.start();
      recording = true;
      btn.textContent = '⏹ Aufnahme stoppen';
      btn.classList.add('listening');
      if (statusEl) statusEl.textContent = 'Whisper-Aufnahme läuft…';
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message;
    }
  });
}

function pickMimeType() {
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

async function sendToWhisper(blob, { promptInput, onTranscript, statusEl }) {
  if (statusEl) statusEl.textContent = 'Whisper transkribiert…';
  const audioBase64 = await blobToBase64(blob);

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType: blob.type }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Transcription failed');

  promptInput.value = data.text;
  if (statusEl) {
    statusEl.textContent = `Whisper: „${data.text}"`;
    statusEl.dataset.filled = '1';
  }
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
