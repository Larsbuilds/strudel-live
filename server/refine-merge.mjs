import { layersFromIntents } from './intent-db.mjs';

export function layersForPrompt(prompt = '') {
  return layersFromIntents(prompt);
}

export function mergeLayersIntoPattern(previousCode, prompt, extraLayers = null) {
  const prev = previousCode?.trim();
  if (!prev) return null;
  const layers = extraLayers ?? layersFromIntents(prompt);
  if (!layers.length) return null;

  if (/stack\s*\(/i.test(prev)) {
    const trimmed = prev.replace(/\s*\)\s*$/, '');
    return `${trimmed},\n  ${layers.join(',\n  ')}\n)`;
  }

  const cpm = prev.match(/setcpm\([^)]+\)/)?.[0] || 'setcpm(32)';
  const body = prev.replace(/setcpm\([^)]+\)\s*/, '').trim().replace(/^\s*$/, '');
  if (!body) return `${cpm}\n\nstack(\n  ${layers.join(',\n  ')}\n)`;
  return `${cpm}\n\nstack(\n  ${body},\n  ${layers.join(',\n  ')}\n)`;
}

export function codesTooSimilar(a, b) {
  if (!a?.trim() || !b?.trim()) return false;
  const na = a.replace(/\s+/g, ' ').trim();
  const nb = b.replace(/\s+/g, ' ').trim();
  if (na === nb) return true;
  return Math.abs(na.length - nb.length) < 24;
}
