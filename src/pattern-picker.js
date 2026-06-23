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
      picker.innerHTML = '';
      for (const name of names) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        picker.append(opt);
      }
      if (patterns[current]) picker.value = current;
      else if (names.length) picker.value = names[0];
      picker._cache = patterns;
      return patterns;
    } catch (err) {
      console.warn('Pattern refresh:', err.message);
      return picker._cache || {};
    }
  }

  picker.addEventListener('change', async () => {
    const patterns = picker._cache || (await refresh());
    const code = patterns[picker.value];
    if (code) onSelect(code, { source: 'picker', name: picker.value });
  });

  window.addEventListener('strudel-live:patterns-saved', () => refresh());

  return { refresh };
}
