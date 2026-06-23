/**
 * Browser-Spracheingabe (kein API-Key nötig) — füllt das KI-Prompt-Feld.
 * Chrome/Edge auf Mac; Safari eingeschränkt.
 */

export function initVoiceInput({ promptInput, onTranscript }) {
  const btn = document.getElementById('voice-btn');
  const status = document.getElementById('voice-status');
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.disabled = true;
    btn.title = 'Spracheingabe nicht unterstützt — Chrome nutzen';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  btn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    recognition.start();
  });

  recognition.onstart = () => {
    listening = true;
    btn.textContent = '⏹ Stop';
    btn.classList.add('listening');
    if (status) status.textContent = 'Höre zu…';
  };

  recognition.onend = () => {
    listening = false;
    btn.textContent = '🎤 Sprechen';
    btn.classList.remove('listening');
    if (status && !status.dataset.filled) status.textContent = '';
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    if (!text) return;
    promptInput.value = text;
    if (status) {
      status.textContent = `Erkannt: „${text}"`;
      status.dataset.filled = '1';
    }
    onTranscript?.(text);
  };

  recognition.onerror = (event) => {
    if (status) {
      status.textContent =
        event.error === 'not-allowed'
          ? 'Mikrofon-Berechtigung verweigert.'
          : `Sprachfehler: ${event.error}`;
      status.dataset.state = 'error';
    }
  };
}
