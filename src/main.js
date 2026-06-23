import '@strudel/repl';
import { patterns } from './patterns.js';
import { initAiPanel, applyCodeToRepl } from './ai-panel.js';

const editor = document.getElementById('repl');
const picker = document.getElementById('pattern-picker');

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

loadPattern(picker.value);
