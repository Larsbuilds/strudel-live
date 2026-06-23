const EXAMPLE_PROMPTS = [
  'Schneller Trance-Beat mit Kick, Hi-Hats und Saw-Lead in A-Moll',
  'Dark techno, 128 BPM, harter 4/4 Kick, minimal',
  'DNB Break bei 174 BPM mit synkopiertem Kick',
  'Chill ambient pad mit langsamen Filter-Sweep',
];

export function initAiPanel({ editor, onCode }) {
  const form = document.getElementById('ai-form');
  const promptInput = document.getElementById('ai-prompt');
  const submitBtn = document.getElementById('ai-submit');
  const statusEl = document.getElementById('ai-status');
  const chipsEl = document.getElementById('ai-chips');
  const setupEl = document.getElementById('ai-setup');

  for (const text of EXAMPLE_PROMPTS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      promptInput.value = text;
      promptInput.focus();
    });
    chipsEl.append(chip);
  }

  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setupEl.hidden = data.configured;
      if (!data.configured) {
        statusEl.textContent = 'API-Key fehlt — siehe Setup-Hinweis oben.';
        statusEl.dataset.state = 'warn';
      }
    } catch {
      setupEl.hidden = false;
    }
  }

  checkStatus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    submitBtn.disabled = true;
    statusEl.dataset.state = 'loading';
    statusEl.textContent = 'KI schreibt Strudel-Code…';

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');

      await onCode(data.code);
      statusEl.dataset.state = 'ok';
      statusEl.textContent = `Läuft — ${data.provider} / ${data.model}`;
    } catch (err) {
      statusEl.dataset.state = 'error';
      statusEl.textContent = err.message;
      if (err.message.includes('API key')) setupEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export function waitForRepl(element) {
  return new Promise((resolve) => {
    if (element.editor) return resolve(element.editor);
    const timer = setInterval(() => {
      if (element.editor) {
        clearInterval(timer);
        resolve(element.editor);
      }
    }, 50);
  });
}

export async function applyCodeToRepl(editorElement, code) {
  const mirror = await waitForRepl(editorElement);
  mirror.setCode(code.trim());
  await mirror.evaluate();
}
