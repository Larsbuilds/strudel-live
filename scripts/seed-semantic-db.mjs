#!/usr/bin/env node
/**
 * Build semantic databases from presets, prompt-book, patterns, and Strudel docs.
 * npm run semantic:seed
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_CATEGORIES } from '../src/prompt-book-data.js';
import { loadAllPatterns, listPatternNames } from '../server/patterns-list.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'server', 'data');
const BASE_PATH = join(DATA, 'intent-examples.base.json');
const OUT_PATH = join(DATA, 'intent-examples.json');
const LAYERS_PATH = join(DATA, 'pattern-layers.json');

/** Genre rules mirrored from pattern-presets.mjs for phrase seeding. */
const PRESET_SEEDS = [
  {
    id: 'preset_10_deep_techno',
    presetId: '10-deep-techno',
    label: 'Deep Hypnotic Techno',
    phrases: [
      'deep techno', 'hypnotic techno', 'peak time techno', 'industrial techno',
      'berlin techno', 'club techno', '128 bpm techno', 'dark techno',
      'hypnotic deep techno', 'minimal berlin techno', 'peak-time techno',
    ],
  },
  {
    id: 'preset_11_schranz',
    presetId: '11-schranz',
    label: 'Industrial Schranz',
    phrases: [
      'schranz', 'industrial schranz', 'hard industrial', '150 bpm schranz',
      'distorted kicks schranz', 'metallic percussion', 'flackerndes stroboskop',
      'aggressiv industrial', 'hard schranz',
    ],
  },
  {
    id: 'preset_12_liquid_dnb',
    presetId: '12-liquid-dnb',
    label: 'Liquid DNB',
    phrases: [
      'liquid dnb', 'liquid drum and bass', 'liquid drum & bass', 'warm pads dnb',
      'rolling break liquid', '174 bpm liquid', 'cyan dnb', 'smooth dnb',
    ],
  },
  {
    id: 'preset_13_acid_techno',
    presetId: '13-acid-techno',
    label: 'Acid Techno',
    phrases: [
      'acid techno', 'acid trance', '303 acid', 'squelchy acid', 'acid line techno',
      'tb-303', 'green acid', '138 bpm acid',
    ],
  },
  {
    id: 'preset_14_ambient',
    presetId: '14-ambient-drone',
    label: 'Ambient Drone',
    phrases: [
      'ambient drone', 'ambient downtempo', 'drone ambient', '80 bpm ambient',
      'evolving pads', 'no kick ambient', 'weiche ambient', 'entspannt ambient',
      'downtempo ambient', '95 bpm chill',
    ],
  },
  {
    id: 'preset_03_dnb',
    presetId: '03-dnb-break',
    label: 'DNB Break',
    phrases: [
      'dnb', 'drum and bass', 'drum & bass', 'neurofunk', 'jungle', 'breakbeat',
      '170 bpm dnb', '172 bpm neuro', 'wobble bass dnb', 'amen break',
    ],
  },
  {
    id: 'preset_02_trance',
    presetId: '02-trance-lead',
    label: 'Trance Lead',
    phrases: [
      'trance', 'uplifting trance', '90s trance', 'euphoric trance', '140 bpm trance',
      'saw lead trance', 'trance lead', '138 bpm trance',
    ],
  },
  {
    id: 'preset_15_stems',
    presetId: '15-stem-reactive',
    label: 'Stem Reactive',
    phrases: [
      'stem reactive', 'stem-reactive', 'fft reactive', 'reactive stems', 'dj stems',
    ],
  },
  {
    id: 'preset_01_kick_snare',
    presetId: '01-kick-snare',
    label: 'Kick Snare Basics',
    phrases: [
      'kick snare', 'grundbeat', 'simple drums', 'minimal drums only', 'einstieg beat',
      'basic beat', 'starter pattern',
    ],
  },
];

const REFINE_SEEDS = [
  { id: 'refine_reverb', concept: 'pad', variant: 'warm', label: 'Mehr Reverb', phrases: ['mehr reverb', 'more reverb', 'mehr raum', 'more room', 'spacious', 'weiter raum'] },
  { id: 'refine_drums_only', concept: 'drums', variant: 'kick', label: 'Nur Drums', phrases: ['nur drums', 'only drums', 'drums only', 'kein lead', 'no melody', 'no lead'] },
  { id: 'refine_harder', concept: 'texture', variant: 'crush', label: 'Härter', phrases: ['härter', 'harder', 'aggressiver', 'more aggressive', 'mehr distortion', 'more distortion', 'verzerrung'] },
  { id: 'refine_slower_sweep', concept: 'fx', variant: 'sweep', label: 'Langsamer Sweep', phrases: ['langsamer filter', 'slower filter', 'slow filter sweep', 'weniger hi-hats', 'fewer hats', 'less hats'] },
  { id: 'refine_more_hats', concept: 'drums', variant: 'hats', label: 'Mehr Hats', phrases: ['mehr hi-hats', 'more hi-hats', 'mehr hh', '16th hats'] },
  { id: 'refine_sub_bass', concept: 'bass', variant: 'sub', label: 'Sub-Bass', phrases: ['mehr bass', 'more bass', 'tiefer bass', 'sub bass', 'low end', 'bassline'] },
  { id: 'refine_acid', concept: 'acid', variant: 'line', label: 'Acid', phrases: ['acid', '303', 'acid line', 'squelch'] },
  { id: 'refine_breakdown', concept: 'pad', variant: 'warm', label: 'Breakdown', phrases: ['breakdown', 'aufbau', 'build up', 'drop preparation', 'spannung'] },
  { id: 'refine_stab', concept: 'stab', variant: 'chord', label: 'Stabs', phrases: ['stab', 'stabs', 'chord stab', 'house stab'] },
  { id: 'refine_arp', concept: 'lead', variant: 'arp', label: 'Arp', phrases: ['arp', 'arpeggio', 'arpeggiator'] },
];

function loadBaseIntents() {
  if (existsSync(BASE_PATH)) {
    return JSON.parse(readFileSync(BASE_PATH, 'utf8'));
  }
  if (existsSync(OUT_PATH)) {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  }
  return [];
}

function phrasesFromPromptText(text) {
  const phrases = new Set();
  const lower = text.toLowerCase().trim();
  if (lower.length > 8 && lower.length < 200) phrases.add(lower);

  const fragments = [
    ...lower.match(/\b\d{2,3}\s*bpm\b/g) || [],
    ...lower.match(/\b(mehr|more|less|weniger|harder|härter|deep|acid|ambient|techno|trance|dnb|bass|kick|hats?|reverb|distort)\b[^,.]*/g) || [],
  ];
  for (const f of fragments) {
    const t = f.trim();
    if (t.length > 3 && t.length < 80) phrases.add(t);
  }
  return [...phrases];
}

function intentsFromPromptBook() {
  const out = [];
  for (const cat of PROMPT_CATEGORIES) {
    for (const p of cat.prompts) {
      if (p.refine) continue;
      if (p.pattern) {
        const preset = PRESET_SEEDS.find((s) => s.presetId === p.pattern);
        if (preset) {
          for (const ph of phrasesFromPromptText(p.text)) {
            if (!preset.phrases.includes(ph)) preset.phrases.push(ph);
          }
        }
      }
      if (p.label) {
        out.push({
          id: `chip_${cat.id}_${p.label.toLowerCase().replace(/\s+/g, '_')}`,
          concept: p.pattern ? 'preset' : cat.id,
          variant: p.pattern || 'warm',
          label: p.label,
          action: p.pattern ? 'load_preset' : undefined,
          presetId: p.pattern,
          phrases: [p.label.toLowerCase()],
          context: p.pattern ? 'ignite' : 'refine',
          source: 'prompt-book',
        });
      }
    }
  }
  return out;
}

function presetIntents() {
  return PRESET_SEEDS.map((p) => ({
    id: p.id,
    concept: 'preset',
    variant: p.presetId,
    label: p.label,
    action: 'load_preset',
    presetId: p.presetId,
    phrases: [...new Set(p.phrases)],
    context: 'ignite',
    source: 'preset',
  }));
}

function refineIntents() {
  return REFINE_SEEDS.map((r) => ({
    ...r,
    excludeIf: r.concept === 'bass' ? ['bass drum', 'drum and bass', 'dnb'] : r.concept === 'texture' ? ['schranz', 'industrial schranz'] : undefined,
    source: 'refine',
  }));
}

function extractLayersFromPattern(presetId, code) {
  const layers = [];
  const stackMatch = code.match(/stack\s*\(([\s\S]*)\)\s*$/m);
  if (!stackMatch) return layers;

  const body = stackMatch[1];
  const lines = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      lines.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) lines.push(current.trim());

  lines.forEach((line, i) => {
    const clean = line.replace(/\/\/.*$/, '').trim();
    if (!clean || clean.length < 4) return;
    let concept = 'texture';
    let variant = `layer_${i}`;

    if (/^s\s*\(/.test(clean)) {
      concept = 'drums';
      if (/bd/.test(clean)) variant = /crush|distort/.test(clean) ? 'kick_hard' : 'kick';
      else if (/\bsd\b/.test(clean)) variant = 'snare';
      else if (/hh\*?(16|32)/.test(clean)) variant = /32/.test(clean) ? 'roll' : 'hats';
      else if (/\bcp\b/.test(clean)) variant = 'clap';
      else if (/\boh\b/.test(clean)) variant = 'openhat';
      else if (/bd\(/.test(clean)) variant = 'break_kick';
      else variant = 'perc';
    } else if (/^note\s*\(/.test(clean)) {
      concept = /lpf\(\s*\d{1,2}\)/.test(clean) || /c1/.test(clean) ? 'bass' : 'pad';
      variant = concept === 'bass' ? (/distort/.test(clean) ? 'reese' : 'sub') : 'warm';
    } else if (/^n\s*\(/.test(clean)) {
      concept = /\.room\(|\.delay\(/.test(clean) ? 'pad' : 'lead';
      variant = /\.attack\(/.test(clean) ? 'warm' : 'saw';
    }

    layers.push({
      presetId,
      index: i,
      concept,
      variant,
      label: `${presetId} layer ${i + 1}`,
      code: clean,
      uses: inferUses(clean),
    });
  });

  return layers;
}

function inferUses(code) {
  const uses = [];
  const checks = [
    's', 'note', 'n', 'gain', 'lpf', 'hpf', 'room', 'delay', 'speed', 'crush',
    'distort', 'pan', 'scale', 'attack', 'release', 'struct', 'perlin', 'sine',
  ];
  for (const fn of checks) {
    if (new RegExp(`\\b${fn}[.(]`).test(code)) uses.push(fn);
  }
  return uses;
}

function buildPatternLayers() {
  const patterns = loadAllPatterns();
  const all = {};
  for (const id of listPatternNames()) {
    const code = patterns[id];
    if (!code) continue;
    const layers = extractLayersFromPattern(id, code);
    if (layers.length) all[id] = layers;
  }
  return all;
}

function mergeIntents(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const item of group) {
      const existing = byId.get(item.id);
      if (!existing) {
        byId.set(item.id, { ...item, phrases: [...new Set(item.phrases || [])] });
        continue;
      }
      existing.phrases = [...new Set([...(existing.phrases || []), ...(item.phrases || [])])];
      if (item.presetId) existing.presetId = item.presetId;
      if (item.action) existing.action = item.action;
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// --- run ---
const base = loadBaseIntents();
const generated = [
  ...presetIntents(),
  ...refineIntents(),
  ...intentsFromPromptBook(),
];

const merged = mergeIntents(base, generated);
const patternLayers = buildPatternLayers();

writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
writeFileSync(LAYERS_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), presets: patternLayers }, null, 2));

const phraseCount = merged.reduce((n, e) => n + (e.phrases?.length || 0), 0);
const layerCount = Object.values(patternLayers).reduce((n, arr) => n + arr.length, 0);

console.log(`✓ intent-examples.json — ${merged.length} intents, ${phraseCount} phrases`);
console.log(`✓ pattern-layers.json — ${Object.keys(patternLayers).length} presets, ${layerCount} layers`);
console.log(`  Run: npm run semantic:index (optional embeddings)`);
