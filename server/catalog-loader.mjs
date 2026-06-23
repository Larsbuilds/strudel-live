/**
 * Load Strudel function docs + merge pattern-derived layers into concepts.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, 'data');

export function loadStrudelFunctions() {
  const raw = JSON.parse(readFileSync(join(DATA, 'strudel-docs.json'), 'utf8'));
  const fns = { ...raw.functions };

  if (fns.perlin) {
    fns['perlin.range'] = {
      ...fns.perlin,
      id: 'perlin.range',
      signature: 'perlin.range(min, max)',
      example: 'speed(perlin.range(0.9, 1.1))',
    };
  }
  if (fns.sine) {
    fns['sine.range'] = {
      ...fns.sine,
      id: 'sine.range',
      signature: 'sine.range(min, max).slow(n)',
      example: 'lpf(sine.range(200, 4000).slow(8))',
    };
  }

  fns.s = {
    ...fns.s,
    description:
      'Drum samples via mini-notation. strudel-live club set: bd, sd, hh, cp, oh (see strudel.cc/samples).',
  };

  return fns;
}

export function mergePatternLayers(baseConcepts) {
  const path = join(DATA, 'pattern-layers.json');
  if (!existsSync(path)) return baseConcepts;

  const { presets = {} } = JSON.parse(readFileSync(path, 'utf8'));
  const concepts = JSON.parse(JSON.stringify(baseConcepts));

  for (const [presetId, layers] of Object.entries(presets)) {
    for (const layer of layers) {
      const concept = concepts[layer.concept];
      if (!concept?.layers) continue;

      let variant = layer.variant;
      if (variant === 'kick' && /crush|distort/.test(layer.code) && !concept.layers.kick_hard) {
        variant = 'kick_hard';
      }

      if (!concept.layers[variant]) {
        concept.layers[variant] = {
          label: layer.label,
          code: layer.code,
          uses: layer.uses || [],
          fromPreset: presetId,
        };
      }
    }
  }

  return concepts;
}

export function catalogStats() {
  const fns = loadStrudelFunctions();
  return {
    functions: Object.keys(fns).length,
    docSource: 'server/data/strudel-docs.json',
    patternLayers: existsSync(join(DATA, 'pattern-layers.json')),
    intentExamples: existsSync(join(DATA, 'intent-examples.json')),
  };
}
