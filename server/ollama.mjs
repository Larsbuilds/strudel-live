/**
 * Ollama — OpenAI-compatible local LLM (strudel-coder, qwen2.5-coder, etc.)
 *
 * Env:
 *   AI_PROVIDER=ollama
 *   OLLAMA_BASE_URL=http://localhost:11434
 *   OLLAMA_MODEL=strudel-live
 */
import { SYSTEM_PROMPT } from './system-prompt.mjs';
import { TOOL_SCHEMA } from './tool-schema.mjs';

const DEFAULT_BASE = 'http://localhost:11434';

export function getOllamaBase(env = process.env) {
  return (env.OLLAMA_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

export function getOllamaModel(env = process.env) {
  return env.OLLAMA_MODEL || 'strudel-live';
}

/** Second LLM: Strudel Coder fine-tune for syntax/codegen. */
export function getSyntaxModel(env = process.env) {
  return env.OLLAMA_SYNTAX_MODEL || env.OLLAMA_STRUDEL_CODER_MODEL || 'strudel-coder';
}

export function isDualLlmEnabled(env = process.env) {
  if (env.OLLAMA_DUAL_LLM === 'false' || env.OLLAMA_DUAL_LLM === '0') return false;
  if (env.OLLAMA_DUAL_LLM === 'true' || env.OLLAMA_DUAL_LLM === '1') return true;
  // Default on when syntax model is explicitly set, or orchestrator is strudel-live alias
  if (env.OLLAMA_SYNTAX_MODEL || env.OLLAMA_STRUDEL_CODER_MODEL) return true;
  const orchestrator = getOllamaModel(env);
  return orchestrator === 'strudel-live' || orchestrator.startsWith('strudel-live:');
}

function fetchTimeout(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  const ac = new AbortController();
  setTimeout(() => ac.abort(), ms);
  return ac.signal;
}

export async function checkOllama(env = process.env) {
  try {
    const res = await fetch(`${getOllamaBase(env)}/api/tags`, {
      signal: fetchTimeout(5000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    const wanted = getOllamaModel(env);
    const hasModel = models.some((n) => n === wanted || n.startsWith(`${wanted}:`));
    const syntaxWanted = getSyntaxModel(env);
    const hasSyntaxModel = models.some(
      (n) => n === syntaxWanted || n.startsWith(`${syntaxWanted}:`),
    );
    return {
      ok: true,
      models,
      hasModel,
      model: wanted,
      dualLlm: isDualLlmEnabled(env),
      syntaxModel: syntaxWanted,
      hasSyntaxModel,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function ollamaChat(
  messages,
  env = process.env,
  { json = false, maxTokens = 1024, model, temperature } = {},
) {
  const base = getOllamaBase(env);
  const resolvedModel = model || getOllamaModel(env);

  const body = {
    model: resolvedModel,
    messages,
    stream: false,
    options: {
      temperature: temperature ?? 0.7,
      num_predict: maxTokens,
    },
  };

  if (json) {
    body.format = 'json';
  }

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: fetchTimeout(180000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw Object.assign(new Error(`Ollama ${res.status}: ${errText || res.statusText}`), {
      status: res.status === 404 ? 503 : 502,
    });
  }

  const data = await res.json();
  const text = data.message?.content ?? '';
  return { text, model: resolvedModel, provider: 'ollama' };
}

/** Orchestrator system — tool JSON + fallback Strudel (strudel-live / Qwen). */
export const ORCHESTRATOR_SYSTEM = `${SYSTEM_PROMPT}

${TOOL_SCHEMA}

You are the ORCHESTRATOR. For modifications (KI hinzufügen), prefer JSON tools:
{"tools":[{"name":"remove_layer","args":{"concept":"drums","variant":"hats"}}]}
{"tools":[{"name":"append_layer","args":{"concept":"bass","variant":"sub"}}]}
For new patterns, output Strudel JS or let the syntax agent handle codegen. Never swap bass (note/lpf) for drums (s/bd).`;

/** @deprecated alias */
export const STRUDEL_CODER_SYSTEM = ORCHESTRATOR_SYSTEM;

export function buildOllamaMessages(system, user) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
