import { loadAllPatterns } from './patterns-list.mjs';

/** Genre → pattern file (without .strudel). First match wins. */
const GENRE_RULES = [
  { id: '10-deep-techno', test: /hypnotic|deep techno|peak.?time|industrial techno|128\s*bpm/i },
  { id: '03-dnb-break', test: /dnb|drum.?and.?bass|neuro|jungle|breakbeat|17[0-9]\s*bpm/i },
  { id: '02-trance-lead', test: /trance|uplifting|acid|euphoric|13[5-9]\s*bpm|140\s*bpm/i },
  { id: '01-kick-snare', test: /kick.?snare|grundbeat|einstieg|simple|minimal drums only/i },
  { id: '07-dj-stems', test: /stem|dj track|soundcloud/i },
  { id: '09-hydra-live', test: /hydra|visuals?.*pattern/i },
];

const EXAMPLE_PATTERN = /stack\s*\(\s*s\s*\(\s*["']bd\*4["']\s*\)\s*,\s*s\s*\(\s*["']~ cp["']\s*\)\s*\)/i;

export function matchPresetId(prompt = '', bpm) {
  const text = `${prompt} ${bpm || ''}`.toLowerCase();
  for (const rule of GENRE_RULES) {
    if (rule.test.test(text)) return rule.id;
  }
  if (/techno|club|berlin|schranz|hard/i.test(text)) return '10-deep-techno';
  return null;
}

export function loadPresetCode(presetId) {
  if (!presetId) return null;
  const patterns = loadAllPatterns();
  return patterns[presetId] || null;
}

export function resolvePresetForPrompt(prompt, { bpm } = {}) {
  const id = matchPresetId(prompt, bpm);
  const code = loadPresetCode(id);
  if (!code) return null;
  return { id, code };
}

export function isWeakStrudel(code) {
  if (!code?.trim()) return true;
  const body = code.replace(/\/\/.*$/gm, '').trim();
  const lines = body.split('\n').filter((l) => l.trim());
  if (lines.length < 3) return true;
  if (EXAMPLE_PATTERN.test(body)) return true;
  const richness = (body.match(/\b(hh|oh|note|n\(|lpf|delay|room|stack|perlin|sine|gain)/gi) || []).length;
  if (richness < 2 && /bd\*4/.test(body)) return true;
  return false;
}
