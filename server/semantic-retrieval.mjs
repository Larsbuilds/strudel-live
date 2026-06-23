/**
 * Hybrid semantic retrieval — professional RAG pattern without a heavy vector DB.
 *
 * Layer 1: BM25-style lexical scoring over intent examples + catalog keywords
 * Layer 2: Ollama embeddings + cosine similarity (optional, cached JSON vectors)
 * Merge:   reciprocal rank fusion (RRF) with confidence gating
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { embedText, cosineSimilarity, checkEmbeddings, getCachePath } from './embeddings.mjs';
import { MUSIC_CONCEPTS, STRUDEL_FUNCTIONS, listFunctions } from './strudel-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_PATH = join(__dirname, 'data', 'intent-examples.json');

const BM25_K1 = 1.2;
const BM25_B = 0.75;
const MIN_LEXICAL_SCORE = 0.22;
const MIN_EMBED_SCORE = 0.55;
const MIN_HYBRID_SCORE = 0.28;
const RRF_K = 60;

function hashText(text) {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
}

function loadEmbeddingCache(env) {
  const path = getCachePath(env);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function vectorFromCache(cache, phrase) {
  const key = hashText(phrase);
  if (cache[key]) return cache[key];
  return null;
}

let intentExamples = null;

export function loadIntentExamples() {
  if (intentExamples) return intentExamples;
  intentExamples = JSON.parse(readFileSync(EXAMPLES_PATH, 'utf8'));
  return intentExamples;
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\wäöüß\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function buildCorpusStats(examples) {
  const docFreq = new Map();
  let totalLen = 0;
  let n = 0;

  for (const ex of examples) {
    for (const phrase of ex.phrases) {
      const tokens = new Set(tokenize(phrase));
      totalLen += tokens.size;
      n += 1;
      for (const t of tokens) {
        docFreq.set(t, (docFreq.get(t) || 0) + 1);
      }
    }
  }

  return { docFreq, avgLen: n ? totalLen / n : 1, n };
}

function bm25Score(queryTokens, docTokens, stats) {
  const { docFreq, avgLen, n } = stats;
  const docLen = docTokens.length || 1;
  const tf = new Map();
  for (const t of docTokens) tf.set(t, (tf.get(t) || 0) + 1);

  let score = 0;
  for (const qt of queryTokens) {
    const freq = tf.get(qt) || 0;
    if (!freq) continue;
    const df = docFreq.get(qt) || 0;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    const norm = freq / (freq + BM25_K1 * (1 - BM25_B + (BM25_B * docLen) / avgLen));
    score += idf * norm;
  }
  return score;
}

function phraseOverlapScore(prompt, phrase) {
  const p = prompt.toLowerCase();
  const ph = phrase.toLowerCase();
  if (p.includes(ph) || ph.includes(p)) return 1;
  const pt = new Set(tokenize(prompt));
  const ht = tokenize(phrase);
  if (!ht.length) return 0;
  let overlap = 0;
  for (const t of ht) if (pt.has(t)) overlap += 1;
  return overlap / ht.length;
}

const REMOVE_SIGNAL =
  /\b(weniger|less|fewer|remove|kein|keine|ohne|without|raus|weg|entfern|no\s+\w+)\b/i;

const VARIANT_ALIASES = {
  sub: ['bass', 'sub'],
  hats: ['hats', 'hat', 'hi', 'hihat', 'hihats'],
  snare: ['snare'],
  kick: ['kick'],
  clap: ['clap'],
  warm: ['pad', 'reverb', 'room', 'raum'],
  saw: ['lead', 'melody'],
};

export function targetMentioned(prompt, variant) {
  const pt = new Set(tokenize(prompt));
  const aliases = VARIANT_ALIASES[variant] || [variant];
  if (aliases.some((a) => pt.has(a))) return true;
  const lower = prompt.toLowerCase();
  if (variant === 'hats' && /hi-?hats?/i.test(lower)) return true;
  if (variant === 'saw' && /\b(nur|only)\s+drums?\b/i.test(lower)) return true;
  return false;
}

export { REMOVE_SIGNAL };

function scoreExampleLexical(prompt, example, stats) {
  if (example.excludeIf?.some((neg) => prompt.toLowerCase().includes(neg.toLowerCase()))) {
    return 0;
  }

  const queryTokens = tokenize(prompt);
  let best = 0;

  for (const phrase of example.phrases) {
    const overlap = phraseOverlapScore(prompt, phrase);
    const bm25 = bm25Score(queryTokens, tokenize(phrase), stats);
    const normalizedBm25 = bm25 / (bm25 + 3);
    const combined = Math.max(overlap, normalizedBm25 * 0.85 + overlap * 0.15);
    if (combined > best) best = combined;
  }

  const hasRemoveSignal = REMOVE_SIGNAL.test(prompt);
  const isRemoveIntent = example.action === 'remove';
  const isAddIntent = !example.action || example.action === 'append';

  if (hasRemoveSignal && isRemoveIntent && targetMentioned(prompt, example.variant)) {
    best = Math.min(1, best + 0.22);
  }
  if (hasRemoveSignal && isAddIntent && example.concept !== 'preset' && example.concept !== 'tempo') {
    best *= 0.35;
  }
  if (!hasRemoveSignal && isRemoveIntent) best *= 0.5;

  return best;
}

function rrf(rank, k = RRF_K) {
  return rank > 0 ? 1 / (k + rank) : 0;
}

function mergeRankings(lexicalHits, embedHits) {
  const byKey = new Map();

  lexicalHits.forEach((hit, i) => {
    const key = `${hit.action || 'add'}:${hit.concept}:${hit.variant}`;
    const entry = byKey.get(key) || { ...hit, lexical: 0, embed: 0, rrf: 0 };
    entry.lexical = hit.score;
    entry.rrf += rrf(i + 1);
    entry.label = hit.label;
    entry.id = hit.id;
    byKey.set(key, entry);
  });

  embedHits.forEach((hit, i) => {
    const key = `${hit.action || 'add'}:${hit.concept}:${hit.variant}`;
    const entry = byKey.get(key) || { ...hit, lexical: 0, embed: 0, rrf: 0 };
    entry.embed = hit.score;
    entry.rrf += rrf(i + 1);
    entry.label = hit.label || entry.label;
    entry.id = hit.id || entry.id;
    byKey.set(key, entry);
  });

  return [...byKey.values()]
    .map((e) => ({
      ...e,
      score: e.rrf + e.lexical * 0.4 + e.embed * 0.6,
      method: e.embed > 0 && e.lexical > 0 ? 'hybrid' : e.embed > 0 ? 'embed' : 'lexical',
    }))
    .sort((a, b) => b.score - a.score);
}

export function searchIntentsLexical(prompt, { limit = 5, minScore = MIN_LEXICAL_SCORE } = {}) {
  const text = prompt?.trim();
  if (!text) return [];

  const examples = loadIntentExamples();
  const stats = buildCorpusStats(examples);
  const isRefineQuery = /\b(mehr|more|add|weniger|less|nur|only|härter|harder|remove|ohne|without)\b/i.test(text);
  const hasRemoveSignal = REMOVE_SIGNAL.test(text);
  const isShort = text.length < 48;

  const hits = examples
    .map((ex) => ({
      id: ex.id,
      concept: ex.concept,
      variant: ex.variant,
      label: ex.label,
      action: ex.action,
      presetId: ex.presetId || (ex.concept === 'preset' ? ex.variant : undefined),
      context: ex.context,
      score: scoreExampleLexical(text, ex, stats),
    }))
    .filter((h) => {
      if (h.score < minScore) return false;
      if (hasRemoveSignal && h.action === 'remove' && !targetMentioned(text, h.variant)) {
        const onlyDrums = /\b(nur|only)\s+drums?\b/i.test(text);
        if (!(onlyDrums && h.id === 'remove_lead')) return false;
      }
      if (isRefineQuery && h.concept === 'preset' && h.score < 0.85) return false;
      if (isShort && h.context === 'ignite' && h.concept === 'preset' && h.score < 0.72) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return hits;
}

export async function searchIntentsSemantic(prompt, env = process.env, opts = {}) {
  const text = prompt?.trim();
  if (!text) return { hits: [], method: 'none' };

  const lexicalHits = searchIntentsLexical(text, opts);
  const embedStatus = await checkEmbeddings(env);

  if (!embedStatus.ok || !embedStatus.hasModel) {
    return {
      hits: lexicalHits.map((h) => ({ ...h, method: 'lexical', confidence: h.score })),
      method: 'lexical',
      embedAvailable: false,
    };
  }

  let queryVec;
  try {
    queryVec = await embedText(text, env);
  } catch {
    return {
      hits: lexicalHits.map((h) => ({ ...h, method: 'lexical', confidence: h.score })),
      method: 'lexical',
      embedAvailable: false,
      embedError: true,
    };
  }

  if (!queryVec) {
    return {
      hits: lexicalHits.map((h) => ({ ...h, method: 'lexical', confidence: h.score })),
      method: 'lexical',
      embedAvailable: false,
    };
  }

  const examples = loadIntentExamples();
  const embedHits = [];
  const cache = loadEmbeddingCache(env);

  for (const ex of examples) {
    if (ex.excludeIf?.some((neg) => text.toLowerCase().includes(neg.toLowerCase()))) continue;

    let best = 0;
    for (const phrase of ex.phrases) {
      const vec = vectorFromCache(cache, phrase);
      if (!vec) continue;
      const sim = cosineSimilarity(queryVec, vec);
      if (sim > best) best = sim;
    }

    if (best >= MIN_EMBED_SCORE) {
      embedHits.push({
        id: ex.id,
        concept: ex.concept,
        variant: ex.variant,
        label: ex.label,
        score: best,
      });
    }
  }

  embedHits.sort((a, b) => b.score - a.score);

  const merged = mergeRankings(lexicalHits, embedHits.slice(0, 8))
    .filter((h) => h.score >= MIN_HYBRID_SCORE || h.lexical >= MIN_LEXICAL_SCORE)
    .slice(0, opts.limit || 5)
    .map((h) => ({ ...h, confidence: Math.min(1, h.score) }));

  return {
    hits: merged,
    method: embedHits.length ? 'hybrid' : 'lexical',
    embedAvailable: true,
    embedModel: embedStatus.model,
  };
}

/** Catalog RAG — lexical + optional embedding over function/concept docs. */
export function searchCatalogLexical(prompt, { maxFunctions = 8, maxConcepts = 5 } = {}) {
  const text = prompt.toLowerCase();
  const words = tokenize(prompt);

  const scoreKeywords = (keywords = []) => {
    let score = 0;
    for (const kw of keywords) {
      const k = kw.toLowerCase();
      if (text.includes(k)) score += 2;
      for (const w of words) {
        if (w.length > 2 && (k.includes(w) || w.includes(k))) score += 0.5;
      }
    }
    return score;
  };

  const fnHits = listFunctions()
    .map((f) => ({
      ...f,
      score: scoreKeywords(f.keywords) + scoreKeywords([f.id, f.category]),
    }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFunctions);

  const conceptHits = Object.values(MUSIC_CONCEPTS)
    .map((c) => {
      const variantKeys = Object.keys(c.layers);
      const score =
        scoreKeywords([c.id, c.label, ...variantKeys]) +
        scoreKeywords(c.functions.flatMap((fid) => STRUDEL_FUNCTIONS[fid]?.keywords || []));
      return { id: c.id, label: c.label, variants: variantKeys, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxConcepts);

  const lines = [];
  if (conceptHits.length) {
    lines.push('Relevant concepts:');
    for (const c of conceptHits) {
      const concept = MUSIC_CONCEPTS[c.id];
      const variant = c.variants[0];
      const layer = concept.layers[variant];
      lines.push(`- ${c.label} (${c.id}/${variant}): ${layer.code.slice(0, 72)}…`);
    }
  }
  if (fnHits.length) {
    lines.push('Relevant Strudel functions:');
    for (const f of fnHits) {
      lines.push(`- ${f.signature} — ${f.description}`);
    }
  }

  return {
    text: lines.length ? `${lines.join('\n')}\n\n` : '',
    concepts: conceptHits.map((c) => c.id),
    functions: fnHits.map((f) => f.id),
    hits: { concepts: conceptHits, functions: fnHits },
  };
}

export const retrieveCatalogContext = searchCatalogLexical;
