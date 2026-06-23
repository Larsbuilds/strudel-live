/**
 * Browser speech → prompt field. Live text in textarea; indicator only when words arrive.
 */
import { getPromptVoiceUi } from './prompt-voice-ui.js';

export function initVoiceInput({ promptInput, onTranscript }) {
  const btn = document.getElementById('voice-btn');
  const ui = getPromptVoiceUi();
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.disabled = true;
    btn.title = 'Spracheingabe nicht unterstützt — Chrome nutzen';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  let listening = false;
  let baseText = '';
  let finalText = '';

  btn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    window.dispatchEvent(new CustomEvent('strudel-live:voice-start'));
    baseText = '';
    finalText = '';
    if (promptInput) promptInput.value = '';
    ui.clear();
    recognition.start();
  });

  window.addEventListener('strudel-live:stop', () => {
    if (listening) recognition.stop();
    ui.clear();
  });

  recognition.onstart = () => {
    listening = true;
    btn.textContent = '⏹ Stop';
    btn.classList.add('listening');
    ui.setListening(true);
  };

  recognition.onend = () => {
    listening = false;
    btn.textContent = '🎤 Sprechen';
    btn.classList.remove('listening');
    ui.setListening(false);
    ui.setInterim('');

    const combined = [baseText, finalText].filter(Boolean).join(' ').trim();
    if (combined && promptInput) promptInput.value = combined;
  };

  recognition.onresult = (event) => {
    let interim = '';
    let latestFinal = finalText;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        latestFinal = latestFinal ? `${latestFinal} ${chunk}` : chunk;
      } else {
        interim += chunk;
      }
    }

    finalText = latestFinal.trim();
    const live = [baseText, finalText, interim.trim()].filter(Boolean).join(' ').trim();

    if (promptInput) promptInput.value = live;

    // Indicator = faint preview of what is still being recognized (not duplicate of full text)
    ui.setInterim(interim.trim() ? `…${interim.trim()}` : '');

    if (finalText && !interim.trim()) {
      onTranscript?.(live);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech' && listening) return;
    ui.clear();
    if (event.error === 'not-allowed') {
      promptInput?.setAttribute('placeholder', 'Mikrofon-Berechtigung verweigert.');
    }
  };
}
