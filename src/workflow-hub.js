import { setLastPattern } from './session.js';
import { parseScaleFromCode } from './scale-utils.js';
import { waitForRepl } from './ai-panel.js';
import { waitForQuantizedBoundary, getReplScheduler } from './strudel-quantize.js';

/** Zentrale Stelle: Code anwenden → Session/Key-Sync/Hydra-Events. */
export function createWorkflowHub(editor) {
  let lastCode = '';
  let lastPrompt = '';

  async function applyPattern(code, meta = {}) {
    const trimmed = code?.trim();
    if (!trimmed) return;

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

    window.dispatchEvent(
      new CustomEvent('strudel-live:pattern', {
        detail: { code: trimmed, scale, prompt: meta.prompt, source: meta.source, quantize: meta._quantize },
      }),
    );

    return { code: trimmed, scale, quantize: meta._quantize };
  }

  function getLastCode() {
    return lastCode || editor.editor?.code || '';
  }

  function getLastPrompt() {
    return lastPrompt;
  }

  return { applyPattern, getLastCode, getLastPrompt };
}
