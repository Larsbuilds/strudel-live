import '@strudel/repl';
import { patterns } from './patterns.js';
import { initAiPanel, applyCodeToRepl } from './ai-panel.js';
import { initMicPanel } from './mic-panel.js';
import { initVoiceInput } from './voice-input.js';

const editor = document.getElementById('repl');
const picker = document.getElementById('pattern-picker');
const promptInput = document.getElementById('ai-prompt');

for (const [name] of Object.entries(patterns)) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  picker.append(option);
}

async function loadPattern(name) {
  const code = patterns[name];
  if (!code) return;
  await applyCodeToRepl(editor, code);
}

picker.addEventListener('change', () => loadPattern(picker.value));

initAiPanel({
  editor,
  onCode: (code) => applyCodeToRepl(editor, code),
});

initVoiceInput({ promptInput });

initMicPanel();

loadPattern(picker.value);
