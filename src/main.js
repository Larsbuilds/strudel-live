import '@strudel/repl';
import { initAiPanel } from './ai-panel.js';
import { initMicPanel } from './mic-panel.js';
import { initMidiPanel } from './midi-panel.js';
import { initVoiceInput } from './voice-input.js';
import { initWhisperRecorder } from './whisper-recorder.js';
import { initDjPanel } from './dj-panel.js';
import { initDjController } from './dj-controller.js';
import { initWamHost } from './wam-host.js';
import { initHydraPanel } from './hydra-panel.js';
import { initSynthDefPanel } from './synthdef-panel.js';
import { createWorkflowHub } from './workflow-hub.js';
import { initPatternPicker } from './pattern-picker.js';

const editor = document.getElementById('repl');
const picker = document.getElementById('pattern-picker');
const promptInput = document.getElementById('ai-prompt');

const hub = createWorkflowHub(editor);

const { refresh: refreshPatterns } = initPatternPicker({
  picker,
  onSelect: (code, meta) => hub.applyPattern(code, meta),
});

initAiPanel({ editor, hub });

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
initDjPanel({ hub });
initDjController();
initWamHost();
initHydraPanel();
initSynthDefPanel();

window.addEventListener('strudel-live:patterns-saved', () => refreshPatterns());

(async () => {
  const patterns = await refreshPatterns();
  const first = Object.keys(patterns)[0];
  if (first) {
    picker.value = first;
    await hub.applyPattern(patterns[first], { source: 'init', name: first });
  }
})();
