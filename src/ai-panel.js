import { session } from './session.js';
import { runIgnite } from './ignite-boot.js';
import { initPromptBook } from './prompt-book.js';

const GENERATE_TIMEOUT_MS = 180_000; // match server ollamaChat timeout

function startLoadingTicker(statusEl, baseText) {
  const start = Date.now();
  const tick = () => {
    const s = Math.floor((Date.now() - start) / 1000);
    const hint =
      s < 20
        ? 'Ollama antwortet…'
        : s < 60
          ? 'Modell lädt — kann 60–90s dauern'
          : 'Noch aktiv — bei >2min Ollama neu starten';
    statusEl.textContent = `${baseText} (${s}s · ${hint})`;
  };
  tick();
  const id = setInterval(tick, 2000);
  return () => clearInterval(id);
}

async function postGenerate(statusEl, body, loadingText) {
  const stopTick = startLoadingTicker(statusEl, loadingText);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), GENERATE_TIMEOUT_MS);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Generation failed');
    return data;
  } finally {
    clearTimeout(timer);
    stopTick();
  }
}

export function initAiPanel({ editor, hub }) {
  const form = document.getElementById('ai-form');
  const promptInput = document.getElementById('ai-prompt');
  const igniteBtn = document.getElementById('ai-ignite');
  const refineBtn = document.getElementById('ai-refine');
  const saveBtn = document.getElementById('save-pattern-btn');
  const igniteCheck = document.getElementById('ignite-mode');
  const djContextCheck = document.getElementById('dj-context-mode');
  const statusEl = document.getElementById('ai-status');
  const chipsEl = document.getElementById('ai-chips');
  const setupEl = document.getElementById('ai-setup');

  initPromptBook({
    promptInput,
    chipsEl,
    refineCheck: null,
    igniteCheck,
    conductorPromptEl: document.getElementById('conductor-prompt'),
    hub,
    editor,
  });

  async function checkStatus() {
    try {
      const [healthRes, statusRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/status'),
      ]);
      const data = await healthRes.json();
      const status = await statusRes.json().catch(() => ({}));

      const ollama = status.providers?.ollama;
      const ollamaDetail = status.ollama;
      setupEl.hidden = data.ai;

      const whisperBtn = document.getElementById('whisper-btn');
      if (whisperBtn) whisperBtn.disabled = !data.whisper;

      if (!data.ai) {
        statusEl.textContent = 'KI fehlt — npm run ollama:setup oder API-Key';
        statusEl.dataset.state = 'warn';
      } else if (ollama) {
        const dual = ollamaDetail?.dualLlm ? ' · dual-LLM' : '';
        const syntax = ollamaDetail?.syntaxModel ? ` + ${ollamaDetail.syntaxModel}` : '';
        statusEl.textContent = `Lokales Modell (Ollama · ${ollamaDetail?.model || data.ollama?.model || 'strudel-live'}${syntax}${dual})`;
        statusEl.dataset.state = 'ok';
      } else if (data.ai) {
        statusEl.textContent = 'Cloud-KI aktiv';
        statusEl.dataset.state = 'ok';
      }

      if (!data.servers?.samples) {
        statusEl.textContent = (statusEl.textContent ? statusEl.textContent + ' · ' : '') + 'Tipp: npm run dev:full für Samples';
      }
    } catch {
      setupEl.hidden = false;
    }
  }

  checkStatus();

  function clearPrompt() {
    if (promptInput) {
      promptInput.value = '';
      promptInput.placeholder = 'Sag oder tippe was dazu soll — z.B. „mehr Bass“';
    }
  }

  async function previewIntents(prompt) {
    try {
      const res = await fetch(`/api/intent?prompt=${encodeURIComponent(prompt)}`);
      const data = await res.json();
      return data.labels || [];
    } catch {
      return [];
    }
  }

  async function runRefine(prompt) {
    const previousCode = await hub.getLastCode();
    if (!previousCode?.trim()) {
      throw new Error('Kein laufendes Pattern — zuerst Ignite oder „Basis abspielen“.');
    }

    const loadingBase = labels.length
      ? `Erkannt: ${labels.join(', ')} — erweitere Pattern`
      : 'KI erweitert das Pattern im Editor';
    statusEl.dataset.state = 'loading';

    const trackContext =
      djContextCheck?.checked && session.selectedTrack ? session.selectedTrack : undefined;

    const data = await postGenerate(statusEl, { prompt, previousCode, trackContext }, loadingBase);

    const unchanged = data.code?.trim() === previousCode.trim();
    const fixNote = data.constraints?.fixes?.includes('refine:unchanged')
      ? ''
      : data.constraints?.fixes?.includes('refine:layer-merge') ||
          data.constraints?.fixes?.includes('agent:tools')
        ? data.agent?.layersRemoved > 0
          ? ' · Layer entfernt'
          : ' · Layer hinzugefügt'
        : '';
    const intentNote = data.intents?.length ? ` · ${data.intents.join(', ')}` : '';
    const agentNote =
      data.agent?.layersAdded > 0 || data.agent?.layersRemoved > 0
        ? ` · Agent: ${data.agent.tools?.map((t) => t.args?.label || t.args?.concept).join(', ')}`
        : '';

    if (!unchanged) {
      await hub.applyPattern(data.code, {
        prompt,
        scale: data.scale,
        source: 'ai',
        fixes: data.constraints?.fixes,
        intents: data.intents,
      });
    }

    statusEl.dataset.state = unchanged ? 'warn' : 'ok';
    statusEl.textContent = unchanged
      ? `Keine Änderung${intentNote} — Formulierung anpassen oder Cloud-KI (siehe docs/STATUS.md)`
      : `Erweitert — ${data.provider}/${data.model}${data.agent?.pipeline ? ` · ${data.agent.pipeline}` : ''}${fixNote}${intentNote}${agentNote}`;

    clearPrompt();
    if (saveBtn) saveBtn.disabled = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    const mode = event.submitter?.value || 'ignite';
    const busy = [igniteBtn, refineBtn].filter(Boolean);
    busy.forEach((b) => (b.disabled = true));
    statusEl.dataset.state = 'loading';

    try {
      if (mode === 'refine') {
        await runRefine(prompt);
        return;
      }

      const useIgnite = igniteCheck?.checked !== false;
      if (useIgnite) {
        statusEl.textContent = 'Ignite — Session wird gebootet…';
        await runIgnite({ prompt, hub, editor, statusEl });
        clearPrompt();
        return;
      }

      statusEl.textContent = 'KI schreibt Strudel-Code…';
      const data = await postGenerate(statusEl, { prompt }, 'KI schreibt Strudel-Code');

      await hub.applyPattern(data.code, { prompt, scale: data.scale, source: 'ai', fixes: data.constraints?.fixes });
      statusEl.dataset.state = 'ok';
      statusEl.textContent = `Läuft — ${data.provider} / ${data.model}`;
      clearPrompt();
      if (saveBtn) saveBtn.disabled = false;
    } catch (err) {
      statusEl.dataset.state = 'error';
      statusEl.textContent =
        err.name === 'AbortError'
          ? 'Zeitüberschreitung (3min) — Ollama hängt? brew services restart ollama'
          : err.message;
      if (err.message?.includes('API key')) setupEl.hidden = false;
    } finally {
      busy.forEach((b) => (b.disabled = false));
    }
  });

  refineBtn?.addEventListener('click', () => {
    if (!promptInput.value.trim()) {
      promptInput.placeholder = 'Kurz sagen was dazu soll — z.B. „mehr Hats und Acid-Bass“';
      promptInput.focus();
    }
  });

  window.addEventListener('strudel-live:voice-start', () => {
    clearPrompt();
  });

  saveBtn?.addEventListener('click', async () => {
    const lastCode = await hub.getLastCode();
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

const replWaiters = new WeakMap();

export function waitForRepl(element) {
  if (element?.editor) return Promise.resolve(element.editor);

  let pending = replWaiters.get(element);
  if (pending) return pending;

  pending = new Promise((resolve) => {
    const timer = setInterval(() => {
      if (element.editor) {
        clearInterval(timer);
        replWaiters.delete(element);
        resolve(element.editor);
      }
    }, 50);
  });
  replWaiters.set(element, pending);
  return pending;
}

export async function applyCodeToRepl(editorElement, code) {
  const mirror = await waitForRepl(editorElement);
  mirror.setCode(code.trim());
  await mirror.evaluate();
}
