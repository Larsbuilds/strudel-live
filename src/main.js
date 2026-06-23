import '@strudel/repl';
import { patterns } from './patterns.js';
import { initAiPanel, applyCodeToRepl } from './ai-panel.js';
import { initMicPanel } from './mic-panel.js';
import { initVoiceInput } from './voice-input.js';
import { initWhisperRecorder } from './whisper-recorder.js';
import { initMidiPanel } from './midi-panel.js';
import { setLastPattern } from './session.js';
import { parseScaleFromCode } from './scale-utils.js';

const editor = document.getElementById('repl');
const picker = document.getElementById('pattern-picker');
const promptInput = document.getElementById('ai-prompt');

function refreshPatternPicker() {
  const current = picker.value;
  picker.innerHTML = '';
  for (const [name] of Object.entries(patterns)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    picker.append(option);
  }
  if (patterns[current]) picker.value = current;
}

refreshPatternPicker();

async function loadPattern(name) {
  const code = patterns[name];
  if (!code) return;
  const scale = parseScaleFromCode(code);
  setLastPattern({ code, scale });
  await applyCodeToRepl(editor, code);
}

picker.addEventListener('change', () => loadPattern(picker.value));

initAiPanel({
  editor,
  onCode: async (code, meta = {}) => {
    const scale = meta.scale ?? parseScaleFromCode(code);
    setLastPattern({ code, prompt: meta.prompt, scale });
    await applyCodeToRepl(editor, code);
  },
});

initVoiceInput({ promptInput });

initWhisperRecorder({
  promptInput,
  onTranscript: (text) => {
    promptInput.value = text;
    document.getElementById('ai-form')?.requestSubmit();
  },
  statusEl: document.getElementById('voice-status'),
});

initMicPanel();
initMidiPanel();

loadPattern(Object.keys(patterns)[0] || '');
