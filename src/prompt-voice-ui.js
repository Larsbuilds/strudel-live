/** Voice feedback inside the prompt textarea — no external bars. */

export function getPromptVoiceUi() {
  const compose = document.querySelector('.prompt-compose');
  const indicator = document.getElementById('prompt-voice-indicator');
  const label = document.getElementById('prompt-voice-label');
  const level = document.getElementById('prompt-audio-level');
  const fill = level?.querySelector('.prompt-audio-level__fill');

  return {
    compose,
    indicator,
    label,
    level,
    fill,
    setListening(active) {
      compose?.classList.toggle('prompt-compose--listening', active);
    },
    /** Browser speech: only show dot when words are actually arriving */
    setInterim(text) {
      if (!indicator || !label) return;
      const t = text?.trim();
      if (t) {
        indicator.hidden = false;
        label.textContent = t;
      } else {
        indicator.hidden = true;
        label.textContent = '';
      }
    },
    clear() {
      this.setListening(false);
      this.setInterim('');
      if (level) level.hidden = true;
      if (fill) fill.style.width = '0%';
    },
    showRecording(active) {
      if (level) level.hidden = !active;
      if (!active && fill) fill.style.width = '0%';
    },
    setLevel01(v) {
      if (fill) fill.style.width = `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
    },
  };
}
