import { setLastPattern } from './session.js';
import { parseScaleFromCode } from './scale-utils.js';
import { waitForRepl } from './ai-panel.js';
import { waitForQuantizedBoundary, getReplScheduler } from './strudel-quantize.js';

function readCodeFromMirror(mirror) {
  if (!mirror) return '';
  return (
    mirror.code ??
    mirror.getCode?.() ??
    mirror.view?.state?.doc?.toString?.() ??
    ''
  ).trim();
}

/** Zentrale Stelle: Code anwenden → Session/Key-Sync/Hydra-Events. */
export function createWorkflowHub(editor) {
  let lastCode = '';
  let lastPrompt = '';
  let playing = false;

  async function getLastCode() {
    try {
      const mirror = await waitForRepl(editor);
      const fromEditor = readCodeFromMirror(mirror);
      if (fromEditor && fromEditor !== 'silence' && !fromEditor.startsWith('// PANIC')) {
        return fromEditor;
      }
    } catch {
      /* repl not ready */
    }
    return lastCode;
  }

  async function applyPattern(code, meta = {}) {
    const trimmed = code?.trim();
    if (!trimmed) return;

    const prevCode = meta.skipLog ? '' : await getLastCode();

    const scale = meta.scale ?? parseScaleFromCode(trimmed);
    setLastPattern({ code: trimmed, prompt: meta.prompt, scale });
    lastCode = trimmed;
    if (meta.prompt) lastPrompt = meta.prompt;

    const mirror = await waitForRepl(editor);
    const scheduler = getReplScheduler(mirror);

    if (meta.quantize) {
      const { quantized, waitedMs } = await waitForQuantizedBoundary(scheduler, meta.bars ?? 1);
      meta._quantize = { quantized, waitedMs };
    }

    mirror.setCode(trimmed);
    await mirror.evaluate();

    const schedAfter = getReplScheduler(mirror);
    if (schedAfter && !schedAfter.started) {
      await mirror.evaluate();
    }

    playing = true;

    if (!meta.skipLog && meta.source !== 'restore') {
      window.dispatchEvent(
        new CustomEvent('strudel-live:session-log', {
          detail: {
            prompt: meta.prompt,
            source: meta.source,
            name: meta.name,
            fixes: meta.fixes,
            intents: meta.intents,
            code: trimmed,
            prevCode,
          },
        }),
      );
    }

    window.dispatchEvent(
      new CustomEvent('strudel-live:pattern', {
        detail: {
          code: trimmed,
          scale,
          prompt: meta.prompt,
          source: meta.source,
          name: meta.name,
          quantize: meta._quantize,
        },
      }),
    );

    return { code: trimmed, scale, quantize: meta._quantize };
  }

  async function stopPlaybackLocal() {
    try {
      const mirror = await waitForRepl(editor);
      mirror?.repl?.stop?.();
      getReplScheduler(mirror)?.stop?.();
    } catch {
      /* */
    }
    playing = false;
  }

  function getLastPrompt() {
    return lastPrompt;
  }

  function isPlaying() {
    return playing;
  }

  return { applyPattern, getLastCode, getLastPrompt, stopPlaybackLocal, isPlaying };
}
