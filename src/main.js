import '@strudel/repl';
import { patterns } from './patterns.js';

const editor = document.getElementById('repl');
const picker = document.getElementById('pattern-picker');

for (const [name, code] of Object.entries(patterns)) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  picker.append(option);
}

function loadPattern(name) {
  const code = patterns[name];
  if (!code) return;
  editor.textContent = `\n${code.trim()}\n`;
}

picker.addEventListener('change', () => loadPattern(picker.value));
loadPattern(picker.value);
