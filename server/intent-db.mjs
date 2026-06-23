/**
 * Intent layer — natural language → concepts (links to strudel-catalog).
 */
import { getLayer } from './strudel-catalog.mjs';
import { searchIntentsLexical, searchIntentsSemantic, REMOVE_SIGNAL } from './semantic-retrieval.mjs';

function hitToIntent(hit, prompt) {
  const isPreset = hit.concept === 'preset' || hit.action === 'load_preset';
  const isTempo = hit.concept === 'tempo';
  const isRemove = hit.action === 'remove';

  if (isPreset) {
    const presetId = hit.presetId || hit.variant;
    return {
      id: hit.id || `preset_${presetId}`,
      label: hit.label || `Preset ${presetId}`,
      concept: 'preset',
      variant: presetId,
      presetId,
      action: 'load_preset',
      priority: Math.round((hit.confidence ?? hit.score ?? 0) * 100),
      layer: '',
      functions: ['load_preset'],
      confidence: hit.confidence ?? hit.score ?? 0,
      method: hit.method || 'lexical',
    };
  }

  if (isRemove) {
    return {
      id: hit.id || `remove_${hit.concept}_${hit.variant}`,
      label: hit.label || `Remove ${hit.concept}/${hit.variant}`,
      concept: hit.concept,
      variant: hit.variant,
      action: 'remove',
      priority: Math.round((hit.confidence ?? hit.score ?? 0) * 100),
      layer: '',
      functions: ['remove_layer'],
      confidence: hit.confidence ?? hit.score ?? 0,
      method: hit.method || 'lexical',
    };
  }

  const layer = getLayer(hit.concept, hit.variant);
  if (!layer?.code && !isTempo) return null;

  return {
    id: hit.id || `${hit.concept}_${hit.variant}`,
    label: hit.label || layer?.label || hit.concept,
    concept: hit.concept,
    variant: hit.variant,
    priority: Math.round((hit.confidence ?? hit.score ?? 0) * 100),
    layer: layer?.code || '',
    functions: layer?.uses || [],
    confidence: hit.confidence ?? hit.score ?? 0,
    method: hit.method || 'lexical',
  };
}

function dedupeIntents(intents) {
  const seen = new Set();
  return intents.filter((m) => {
    const key =
      m.concept === 'preset'
        ? `preset:${m.presetId}`
        : m.action === 'remove'
          ? `remove:${m.concept}:${m.variant}`
          : `${m.concept}:${m.variant}`;
    if (seen.has(key)) return false;
    if (!m.layer && m.concept !== 'tempo' && m.concept !== 'preset' && m.action !== 'remove') return false;
    seen.add(key);
    return true;
  });
}

export function resolveIntents(prompt = '') {
  const text = prompt.trim();
  if (!text) return [];

  const hits = searchIntentsLexical(text, { limit: 10 });
  if (!hits.length) return [];

  const topScore = hits[0].score;
  const filtered = hits.filter(
    (h) => h.score >= 0.38 && (h.score >= topScore - 0.12 || h.score >= 0.72),
  );

  const intents = filtered.map((h) => hitToIntent({ ...h, confidence: h.score }, text)).filter(Boolean);

  const removeSignal = REMOVE_SIGNAL.test(text);
  const resolved = dedupeIntents(intents.sort((a, b) => b.priority - a.priority));
  if (!removeSignal) return resolved;

  const removes = resolved.filter((i) => i.action === 'remove');
  if (!removes.length) return resolved;

  return [removes[0]];
}

export async function resolveIntentsSemantic(prompt = '', env = process.env) {
  const text = prompt.trim();
  if (!text) return { intents: [], method: 'none' };

  const { hits, method, embedAvailable, embedModel } = await searchIntentsSemantic(text, env, {
    limit: 8,
  });
  const intents = hits.map((h) => hitToIntent(h, text)).filter(Boolean);

  return {
    intents: dedupeIntents(intents.sort((a, b) => b.priority - a.priority)),
    method,
    embedAvailable,
    embedModel,
  };
}

export function layersFromIntents(prompt) {
  return resolveIntents(prompt)
    .filter((i) => i.concept !== 'preset')
    .map((i) => i.layer)
    .filter(Boolean);
}

export function formatIntentHint(prompt) {
  const intents = resolveIntents(prompt);
  if (!intents.length) return '';
  const lines = intents.map((i) => {
    const target =
      i.concept === 'preset'
        ? `load_preset(${i.presetId})`
        : i.action === 'remove'
          ? `remove_layer(${i.concept}/${i.variant})`
          : i.layer || '(tool)';
    return `- ${i.label} [${i.concept}/${i.variant}] conf=${(i.confidence * 100).toFixed(0)}% → ${target}`;
  });
  return `Semantic intents (hybrid retrieval, do not swap bass↔drums):\n${lines.join('\n')}\n\n`;
}

export function intentSummary(prompt) {
  return resolveIntents(prompt).map((i) => i.label);
}

export function intentsToToolCalls(prompt, intents = null) {
  const resolved = intents || resolveIntents(prompt);
  return resolved.flatMap((i) => {
    if (i.concept === 'preset' || i.action === 'load_preset') {
      return [
        {
          name: 'load_preset',
          args: { presetId: i.presetId || i.variant, label: i.label },
        },
      ];
    }
    if (i.concept === 'tempo') {
      const text = prompt.toLowerCase();
      const bpmMatch = text.match(/\b(\d{2,3})\s*bpm\b/);
      const bpm = bpmMatch ? Number(bpmMatch[1]) : i.variant === 'up' ? 132 : 118;
      return [{ name: 'set_bpm', args: { bpm, label: i.label } }];
    }
    if (i.action === 'remove') {
      return [
        {
          name: 'remove_layer',
          args: { concept: i.concept, variant: i.variant, label: i.label },
        },
      ];
    }
    if (!i.layer) return [];
    return [
      {
        name: 'append_layer',
        args: { concept: i.concept, variant: i.variant, label: i.label },
      },
    ];
  });
}

export function intentDbStats() {
  return { retrieval: 'hybrid-bm25-embeddings', presetSupport: true };
}
