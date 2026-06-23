import { session } from './session.js';
import { runIgnite } from './ignite-boot.js';
import { initPromptBook } from './prompt-book.js';

export function initAiPanel({ editor, hub }) {
  const form = document.getElementById('ai-form');
  const promptInput = document.getElementById('ai-prompt');
  const submitBtn = document.getElementById('ai-submit');
  const saveBtn = document.getElementById('save-pattern-btn');
  const refineCheck = document.getElementById('refine-mode');
  const igniteCheck = document.getElementById('ignite-mode');
  const djContextCheck = document.getElementById('dj-context-mode');
  const statusEl = document.getElementById('ai-status');
  const chipsEl = document.getElementById('ai-chips');
  const setupEl = document.getElementById('ai-setup');

  initPromptBook({
    promptInput,
    chipsEl,
    refineCheck,
    igniteCheck,
    conductorPromptEl: document.getElementById('conductor-prompt'),
  });

  async function checkStatus() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setupEl.hidden = data.ai;
      const whisperBtn = document.getElementById('whisper-btn');
      if (whisperBtn) whisperBtn.disabled = !data.whisper;
      if (!data.ai) {
        statusEl.textContent = 'API-Key fehlt — npm run setup';
        statusEl.dataset.state = 'warn';
      }
      if (!data.servers?.samples) {
        statusEl.textContent = (statusEl.textContent ? statusEl.textContent + ' · ' : '') + 'Tipp: npm run dev:full für Samples';
      }
    } catch {
      setupEl.hidden = false;
    }
  }

  checkStatus();

  function syncSubmitLabel() {
    if (!submitBtn) return;
    if (refineCheck?.checked) {
      submitBtn.textContent = 'Verfeinern & Abspielen';
    } else if (igniteCheck?.checked !== false) {
      submitBtn.textContent = 'Ignite & Start';
    } else {
      submitBtn.textContent = 'Generieren & Abspielen';
    }
  }
  refineCheck?.addEventListener('change', syncSubmitLabel);
  igniteCheck?.addEventListener('change', syncSubmitLabel);
  syncSubmitLabel();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    submitBtn.disabled = true;
    statusEl.dataset.state = 'loading';

    const useIgnite = igniteCheck?.checked !== false && !refineCheck?.checked;

    try {
      if (useIgnite) {
        statusEl.textContent = 'Ignite — Session wird gebootet…';
        await runIgnite({ prompt, hub, editor, statusEl });
        return;
      }

      statusEl.textContent = refineCheck?.checked
        ? 'KI verfeinert das aktuelle Pattern…'
        : 'KI schreibt Strudel-Code…';

      const previousCode = refineCheck?.checked ? hub.getLastCode() : undefined;
      const trackContext =
        djContextCheck?.checked && session.selectedTrack ? session.selectedTrack : undefined;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, previousCode, trackContext }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Generation failed');

      await hub.applyPattern(data.code, {
        prompt,
        scale: data.scale,
        source: 'ai',
      });
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
    const lastCode = hub.getLastCode();
    if (!lastCode) return;
    saveBtn.disabled = true;
    try {
      const res = await fetch('/api/save-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: lastCode, name: promptInput.value.trim() || 'ai-pattern' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      statusEl.textContent = `Gespeichert: ${data.filepath}`;
      statusEl.dataset.state = 'ok';
      window.dispatchEvent(new CustomEvent('strudel-live:patterns-saved', { detail: data }));
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.dataset.state = 'error';
    } finally {
      saveBtn.disabled = false;
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
