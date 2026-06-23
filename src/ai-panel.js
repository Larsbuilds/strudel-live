const EXAMPLE_PROMPTS = [
  'Schneller Trance-Beat mit Kick, Hi-Hats und Saw-Lead in A-Moll',
  'Dark techno, 128 BPM, harter 4/4 Kick, minimal',
  'DNB Break bei 174 BPM mit synkopiertem Kick',
  'Chill ambient pad mit langsamen Filter-Sweep',
  'mehr Reverb und langsamerer Filter',
  'nur Drums, kein Lead',
];

export function initAiPanel({ editor, onCode }) {
  const form = document.getElementById('ai-form');
  const promptInput = document.getElementById('ai-prompt');
  const submitBtn = document.getElementById('ai-submit');
  const saveBtn = document.getElementById('save-pattern-btn');
  const refineCheck = document.getElementById('refine-mode');
  const statusEl = document.getElementById('ai-status');
  const chipsEl = document.getElementById('ai-chips');
  const setupEl = document.getElementById('ai-setup');

  let lastCode = '';
  let lastPrompt = '';

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
      const whisperBtn = document.getElementById('whisper-btn');
      if (whisperBtn) whisperBtn.disabled = !data.whisper;
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
    statusEl.textContent = refineCheck?.checked
      ? 'KI verfeinert das aktuelle Pattern…'
      : 'KI schreibt Strudel-Code…';

    try {
      const previousCode = refineCheck?.checked ? lastCode || editor.editor?.code : undefined;
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, previousCode }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');

      lastCode = data.code;
      lastPrompt = prompt;
      await onCode(data.code, { prompt, scale: data.scale });
      statusEl.dataset.state = 'ok';
      statusEl.textContent = `Läuft — ${data.provider} / ${data.model}${data.scale ? ` · ${data.scale.label}` : ''}`;
      if (saveBtn) saveBtn.disabled = false;
    } catch (err) {
      statusEl.dataset.state = 'error';
      statusEl.textContent = err.message;
      if (err.message.includes('API key')) setupEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  saveBtn?.addEventListener('click', async () => {
    if (!lastCode) return;
    saveBtn.disabled = true;
    try {
      const res = await fetch('/api/save-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: lastCode, name: lastPrompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      statusEl.textContent = `Gespeichert: ${data.filepath} (Seite neu laden für Dropdown)`;
      statusEl.dataset.state = 'ok';
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.dataset.state = 'error';
    } finally {
      saveBtn.disabled = false;
    }
  });

  return {
    setLastCode: (code) => {
      lastCode = code;
    },
  };
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
