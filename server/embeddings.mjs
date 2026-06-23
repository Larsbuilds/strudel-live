/**
 * Local embeddings via Ollama — optional semantic layer.
 * Uses a small embedding model; vectors cached on disk (no separate vector DB required).
 *
 * Env:
 *   OLLAMA_EMBED_MODEL=nomic-embed-text
 *   SEMANTIC_EMBED_CACHE=server/data/embedding-cache.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { getOllamaBase } from './ollama.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE = join(__dirname, 'data', 'embedding-cache.json');

export function getEmbedModel(env = process.env) {
  return env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
}

export function getCachePath(env = process.env) {
  return env.SEMANTIC_EMBED_CACHE || DEFAULT_CACHE;
}

let memoryCache = null;

function loadCache(env) {
  if (memoryCache) return memoryCache;
  const path = getCachePath(env);
  if (existsSync(path)) {
    try {
      memoryCache = JSON.parse(readFileSync(path, 'utf8'));
      return memoryCache;
    } catch {
      memoryCache = {};
    }
  } else {
    memoryCache = {};
  }
  return memoryCache;
}

function saveCache(env) {
  const path = getCachePath(env);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(memoryCache, null, 0));
}

function hashText(text) {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export async function checkEmbeddings(env = process.env) {
  try {
    const base = getOllamaBase(env);
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const model = getEmbedModel(env);
    const hasModel = (data.models || []).some(
      (m) => m.name === model || m.name.startsWith(`${model}:`),
    );
    const cache = loadCache(env);
    return { ok: true, hasModel, model, cachedVectors: Object.keys(cache).length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function embedText(text, env = process.env) {
  const normalized = text.trim();
  if (!normalized) return null;

  const cache = loadCache(env);
  const key = hashText(normalized);
  if (cache[key]) return cache[key];

  const base = getOllamaBase(env);
  const model = getEmbedModel(env);
  const res = await fetch(`${base}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: normalized }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama embeddings ${res.status}: ${errText || res.statusText}`);
  }

  const data = await res.json();
  const vector = data.embedding;
  if (!Array.isArray(vector) || !vector.length) return null;

  cache[key] = vector;
  saveCache(env);
  return vector;
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
