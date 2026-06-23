/**
 * Strudel tool runner — small LLM orchestrates tools, catalog executes them.
 *
 * Tools (JSON):
 *   append_layer { concept, variant }
 *   remove_layer { concept, variant }
 *   set_bpm      { bpm }
 *   load_preset  { presetId }
 */
import { getLayer } from './strudel-catalog.mjs';
import { searchCatalogLexical as retrieveCatalogContext } from './semantic-retrieval.mjs';
import { intentsToToolCalls, resolveIntents } from './intent-db.mjs';
import { mergeLayersIntoPattern } from './refine-merge.mjs';
import { removeLayersFromPattern } from './layer-removal.mjs';
import { loadPresetCode } from './pattern-presets.mjs';
import { TOOL_SCHEMA } from './tool-schema.mjs';

export { TOOL_SCHEMA };

export function resolveLayerTool({ concept, variant }) {
  const layer = getLayer(concept, variant);
  if (!layer) return null;
  return layer.code;
}

export function runToolCalls(tools, { previousCode, prompt } = {}) {
  const log = [];
  let code = previousCode?.trim() || '';
  const layers = [];
  let layersRemoved = 0;

  for (const tool of tools) {
    if (tool.name === 'append_layer') {
      const layerCode = resolveLayerTool(tool.args || {});
      if (layerCode) {
        layers.push(layerCode);
        log.push({
          tool: 'append_layer',
          concept: tool.args?.concept,
          variant: tool.args?.variant,
          label: tool.args?.label,
          ok: true,
        });
      } else {
        log.push({ tool: 'append_layer', args: tool.args, ok: false, error: 'unknown layer' });
      }
    } else if (tool.name === 'remove_layer') {
      const args = tool.args || {};
      const result = removeLayersFromPattern(code, [{ concept: args.concept, variant: args.variant }]);
      if (result?.code) {
        code = result.code;
        layersRemoved += result.removed;
        log.push({
          tool: 'remove_layer',
          concept: args.concept,
          variant: args.variant,
          label: args.label,
          removed: result.removed,
          ok: true,
        });
      } else {
        log.push({ tool: 'remove_layer', args, ok: false, error: 'no matching layer' });
      }
    } else if (tool.name === 'set_bpm') {
      const bpm = Number(tool.args?.bpm) || 128;
      const cpm = bpm / 4;
      const cpmLine = `setcpm(${cpm})`;
      if (/setcpm\(/i.test(code)) {
        code = code.replace(/setcpm\([^)]+\)/i, cpmLine);
      } else {
        code = `${cpmLine}\n\n${code}`.trim();
      }
      log.push({ tool: 'set_bpm', bpm, ok: true });
    } else if (tool.name === 'load_preset') {
      const preset = loadPresetCode(tool.args?.presetId);
      if (preset) {
        code = preset;
        log.push({ tool: 'load_preset', presetId: tool.args?.presetId, ok: true });
      } else {
        log.push({ tool: 'load_preset', ok: false });
      }
    }
  }

  if (layers.length) {
    const merged = mergeLayersIntoPattern(code || 'setcpm(32)\nstack(s("bd*4"))', prompt || '', layers);
    if (merged) code = merged;
  }

  return { code, log, layersAdded: layers.length, layersRemoved };
}

/** Agent path: semantic intents → tool calls → catalog → Strudel code (sync, fast). */
export function planAgentActions(prompt, { previousCode } = {}) {
  const intents = resolveIntents(prompt);
  const tools = intentsToToolCalls(prompt, intents);
  const rag = retrieveCatalogContext(prompt);
  const toolResult = previousCode?.trim()
    ? runToolCalls(tools, { previousCode, prompt })
    : runToolCalls(tools, { previousCode: '', prompt });

  return {
    intents: intents.map((i) => ({
      id: i.id,
      label: i.label,
      concept: i.concept,
      variant: i.variant,
      functions: i.functions,
    })),
    tools,
    rag,
    ...toolResult,
    source: tools.length ? 'agent-tools' : 'none',
    retrieval: { method: 'lexical', embedAvailable: false },
  };
}

export function tryParseToolJson(text) {
  const trimmed = stripJsonFences(text);
  if (!trimmed) return null;

  const fromObject = parseToolsPayload(trimmed);
  if (fromObject) return fromObject;

  const match = trimmed.match(/\{[\s\S]*"tools"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (match) return parseToolsPayload(match[0]);

  return null;
}

function stripJsonFences(text) {
  return text
    ?.replace(/^```(?:json|javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function parseToolsPayload(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tools)) return normalizeToolList(parsed.tools);
    if (Array.isArray(parsed)) return normalizeLayerSpecs(parsed);
    if (parsed?.concept) return normalizeLayerSpecs([parsed]);
  } catch {
    /* fall through */
  }
  return null;
}

function normalizeLayerSpecs(items) {
  const tools = items
    .map((item) => {
      const concept = String(item.concept || item.name || '')
        .split('|')[0]
        .trim();
      const variant = item.variant || item.type;
      if (!concept || !variant) return null;
      return {
        name: 'append_layer',
        args: { concept, variant, label: item.label },
      };
    })
    .filter(Boolean);
  return tools.length ? tools : null;
}

function normalizeToolList(tools) {
  return tools
    .map((tool) => {
      if (tool.name) return tool;
      if (tool.action === 'remove' && tool.concept) {
        return {
          name: 'remove_layer',
          args: {
            concept: String(tool.concept).split('|')[0].trim(),
            variant: tool.variant,
            label: tool.label,
          },
        };
      }
      if (tool.concept) {
        return {
          name: 'append_layer',
          args: {
            concept: String(tool.concept).split('|')[0].trim(),
            variant: tool.variant,
            label: tool.label,
          },
        };
      }
      return null;
    })
    .filter(Boolean);
}

export function extractToolsFromLlm(text) {
  return tryParseToolJson(text);
}

/** Reject JSON-ish LLM output that parses as JS but is not Strudel music. */
export function looksLikeStrudelMusic(code) {
  if (!code?.trim()) return false;
  if (/"concept"\s*:/.test(code) || /"variant"\s*:/.test(code)) return false;
  return /\b(stack|s\(|note\(|n\(|sound\(|setcpm\()/i.test(code);
}
