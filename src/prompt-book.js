import { PROMPT_CATEGORIES } from './prompt-book-data.js';

export function initPromptBook({ promptInput, chipsEl, refineCheck, igniteCheck, conductorPromptEl }) {
  if (!chipsEl) return;

  chipsEl.innerHTML = '';
  chipsEl.classList.add('prompt-chips');

  for (const cat of PROMPT_CATEGORIES) {
    const heading = document.createElement('span');
    heading.className = 'chip-category';
    heading.textContent = cat.label;
    chipsEl.append(heading);

    for (const p of cat.prompts) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.title = p.text;
      chip.textContent = p.label;
      chip.addEventListener('click', () => {
        const target = p.conductor && conductorPromptEl ? conductorPromptEl : promptInput;
        if (!target) return;
        target.value = p.text;
        target.focus();

        if (p.refine && refineCheck) {
          refineCheck.checked = true;
          if (igniteCheck) igniteCheck.checked = false;
        } else if (p.conductor) {
          if (refineCheck) refineCheck.checked = false;
          document.querySelector('.dj-panel')?.setAttribute('open', '');
          conductorPromptEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          if (refineCheck) refineCheck.checked = false;
          if (igniteCheck) igniteCheck.checked = true;
        }

        refineCheck?.dispatchEvent(new Event('change'));
      });
      chipsEl.append(chip);
    }
  }
}
