import { labelForPattern } from './pattern-labels.js';

export async function fetchPatterns() {
  const res = await fetch('/api/patterns');
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Patterns load failed');
  return data.patterns;
}

export function initPatternPicker({ picker, onSelect }) {
  async function refresh() {
    try {
      const patterns = await fetchPatterns();
      const names = Object.keys(patterns).sort();
      const current = picker.value;
      const placeholder = picker.querySelector('option[value=""]');
      picker.innerHTML = '';
      if (placeholder) {
        picker.append(placeholder);
      } else {
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '— wählen —';
        picker.append(empty);
      }
      for (const name of names) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = labelForPattern(name);
        picker.append(opt);
      }
      if (patterns[current]) picker.value = current;
      picker._cache = patterns;
      return patterns;
    } catch (err) {
      console.warn('Pattern refresh:', err.message);
      return picker._cache || {};
    }
  }

  const playBtn = document.getElementById('pattern-play-btn');

  async function playSelected() {
    const name = picker.value;
    if (!name) return;
    const patterns = picker._cache || (await refresh());
    const code = patterns[name];
    if (code) onSelect(code, { source: 'picker', name });
  }

  playBtn?.addEventListener('click', () => playSelected());

  picker.addEventListener('change', () => {
    // Only select — explicit „Basis abspielen“ starts audio
    if (!picker.value) {
      window.dispatchEvent(new CustomEvent('strudel-live:pattern-clear'));
    }
  });

  window.addEventListener('strudel-live:patterns-saved', () => refresh());

  return { refresh, playSelected };
}
