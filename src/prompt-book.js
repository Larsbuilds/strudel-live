import { PROMPT_CATEGORIES } from './prompt-book-data.js';

export function initPromptBook({ promptInput, chipsEl, refineCheck, igniteCheck, conductorPromptEl, hub, editor }) {
  if (!chipsEl) return;

  chipsEl.innerHTML = '';
  chipsEl.classList.add('prompt-chips');

  async function loadPreset(patternId) {
    if (!hub || !patternId) return;
    const res = await fetch('/api/patterns');
    const data = await res.json();
    const code = data.patterns?.[patternId];
    if (!code) return;
    await hub.applyPattern(code, { source: 'preset', name: patternId, prompt: patternId });
    const status = document.getElementById('ai-status');
    if (status) {
      status.dataset.state = 'ok';
      status.textContent = `Preset — ${patternId}`;
    }
    document.getElementById('repl')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('save-pattern-btn').disabled = false;
  }

  for (const cat of PROMPT_CATEGORIES) {
    const heading = document.createElement('span');
    heading.className = 'chip-category';
    heading.textContent = cat.label;
    chipsEl.append(heading);

    for (const p of cat.prompts) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.title = p.pattern ? `${p.text}\n\nShift+Klick: Preset „${p.pattern}“ ohne KI` : p.text;
      chip.textContent = p.label;
      chip.addEventListener('click', (e) => {
        if (e.shiftKey && p.pattern) {
          e.preventDefault();
          loadPreset(p.pattern);
          return;
        }
        const target = p.conductor && conductorPromptEl ? conductorPromptEl : promptInput;
        if (!target) return;
        target.value = p.text;
        target.focus();

        if (p.refine) {
          const status = document.getElementById('ai-status');
          if (status) {
            status.textContent = 'Läuft ein Beat? → „KI hinzufügen“ klicken';
            status.dataset.state = 'ok';
          }
        } else if (p.conductor) {
          conductorPromptEl?.focus({ preventScroll: true });
        } else {
          if (igniteCheck) igniteCheck.checked = true;
        }
      });
      chipsEl.append(chip);
    }
  }
}
