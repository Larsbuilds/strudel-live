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
    return { ok: true, models, hasModel, model: wanted };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function ollamaChat(messages, env = process.env, { json = false, maxTokens = 1024 } = {}) {
  const base = getOllamaBase(env);
  const model = getOllamaModel(env);

  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature: 0.7,
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
  return { text, model, provider: 'ollama' };
}

/** Strudel-coder style system prompt (amhinson/strudel-coder-0.5B). */
export const STRUDEL_CODER_SYSTEM = `${SYSTEM_PROMPT}

${TOOL_SCHEMA}

Prefer JSON tools for modifications:
{"tools":[{"name":"remove_layer","args":{"concept":"drums","variant":"hats"}}]}
{"tools":[{"name":"append_layer","args":{"concept":"bass","variant":"sub"}}]}
Or output Strudel JS for new patterns. Never swap bass (note/lpf) for drums (s/bd).`;

export function buildOllamaMessages(system, user) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
