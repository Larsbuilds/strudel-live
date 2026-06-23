/**
 * Strudel function catalog — reference layer linked to semantic concepts.
 * Functions: server/data/strudel-docs.json (strudel.cc)
 * Layers: curated + pattern-layers.json (from npm run semantic:seed)
 */
import { loadStrudelFunctions, mergePatternLayers } from './catalog-loader.mjs';

export const STRUDEL_FUNCTIONS = loadStrudelFunctions();

/** Concepts group catalog layers + link to Strudel functions. */
const BASE_MUSIC_CONCEPTS = {
  bass: {
    id: 'bass',
    label: 'Bass',
    functions: ['note', 'n', 'gain', 'lpf', 's'],
    layers: {
      sub: {
        label: 'Sub-Bass',
        code: 'note("c1*4").s("sawtooth").gain(0.44).lpf(85).postgain(0.95)',
        uses: ['note', 's', 'gain', 'lpf'],
      },
      reese: {
        label: 'Reese Bass',
        code: 'note("c1*2").s("sawtooth").gain(0.4).lpf(sine.range(80, 400).slow(8)).postgain(0.9)',
        uses: ['note', 's', 'gain', 'lpf', 'sine.range'],
      },
    },
  },
  drums: {
    id: 'drums',
    label: 'Drums',
    functions: ['s', 'gain', 'speed', 'perlin.range'],
    layers: {
      kick: {
        label: 'Kick',
        code: 's("bd*4").gain(0.92).lpf(120)',
        uses: ['s', 'gain', 'lpf'],
      },
      snare: {
        label: 'Snare',
        code: 's("~ sd ~ sd").gain(0.7)',
        uses: ['s', 'gain'],
      },
      hats: {
        label: 'Hi-Hats',
        code: 's("hh*16").gain(0.32).speed(perlin.range(0.88, 1.12))',
        uses: ['s', 'gain', 'speed', 'perlin.range'],
      },
      clap: {
        label: 'Clap',
        code: 's("~ cp ~ cp").gain(0.58).pan(sine.range(-0.3, 0.4).fast(2))',
        uses: ['s', 'gain'],
      },
      openhat: {
        label: 'Open Hat',
        code: 's("~ oh ~ oh").gain(0.26)',
        uses: ['s', 'gain'],
      },
      roll: {
        label: 'Hat Roll',
        code: 's("hh*32").gain(0.34).speed(1.8)',
        uses: ['s', 'gain', 'speed'],
      },
      perc: {
        label: 'Percussion',
        code: 's("~ cp ~ ~ cp cp ~").gain(0.42).speed(perlin.range(0.92, 1.08))',
        uses: ['s', 'gain', 'speed', 'perlin.range'],
      },
    },
  },
  acid: {
    id: 'acid',
    label: 'Acid',
    functions: ['note', 's', 'lpf', 'distort', 'sine.range'],
    layers: {
      line: {
        label: 'Acid 303',
        code: 'note("c2*8").s("sawtooth").gain(0.38).lpf(sine.range(280, 2800).fast(2)).distort(0.35)',
        uses: ['note', 's', 'gain', 'lpf', 'distort', 'sine.range'],
      },
    },
  },
  pad: {
    id: 'pad',
    label: 'Pad',
    functions: ['note', 'n', 'room', 'delay', 'gain', 'lpf'],
    layers: {
      warm: {
        label: 'Warm Pad',
        code: 'note("c3*4").s("sine").gain(0.28).room(0.55).delay(0.28).lpf(900)',
        uses: ['note', 's', 'gain', 'room', 'delay', 'lpf'],
      },
    },
  },
  lead: {
    id: 'lead',
    label: 'Lead',
    functions: ['n', 'note', 'gain', 'lpf', 'delay', 'scale'],
    layers: {
      saw: {
        label: 'Saw Lead',
        code: 'n("0 2 4 7").scale("A:minor").s("sawtooth").gain(0.32).lpf(1200).delay(0.2)',
        uses: ['n', 'gain', 'lpf', 'delay', 'scale'],
      },
      arp: {
        label: 'Arpeggio',
        code: 'n("0 2 4 7 4 2").scale("A:minor").s("square").gain(0.28).lpf(1800).fast(2)',
        uses: ['n', 'scale', 'gain', 'lpf', 'fast'],
      },
    },
  },
  stab: {
    id: 'stab',
    label: 'Stab',
    functions: ['chord', 'n', 'gain', 'lpf'],
    layers: {
      chord: {
        label: 'Chord Stab',
        code: 'n("0 4 7").scale("A:minor").s("sawtooth").gain(0.36).lpf(1400).struct("~ x ~ x")',
        uses: ['n', 'scale', 'gain', 'lpf', 'struct'],
      },
    },
  },
  fx: {
    id: 'fx',
    label: 'FX',
    functions: ['lpf', 'cutoff', 'sine.range', 'delay', 'room'],
    layers: {
      sweep: {
        label: 'Filter Sweep',
        code: 's("bd*4").gain(0.01).lpf(sine.range(120, 4200).slow(16)).room(0.35)',
        uses: ['s', 'gain', 'lpf', 'sine.range', 'room'],
      },
      echo: {
        label: 'Dub Delay',
        code: 's("~ cp ~ cp").gain(0.35).delay(0.45).room(0.4)',
        uses: ['s', 'gain', 'delay', 'room'],
      },
    },
  },
  groove: {
    id: 'groove',
    label: 'Groove',
    functions: ['speed', 'perlin.range', 'sometimes', 'struct'],
    layers: {
      shuffle: {
        label: 'Shuffle',
        code: 's("hh*8").gain(0.3).speed(perlin.range(0.86, 1.14)).sometimes(x => x.fast(2))',
        uses: ['s', 'gain', 'speed', 'perlin.range', 'sometimes'],
      },
    },
  },
  texture: {
    id: 'texture',
    label: 'Texture',
    functions: ['s', 'gain', 'crush', 'distort'],
    layers: {
      crush: {
        label: 'Crush',
        code: 's("~ ~ cp ~").gain(0.5).crush(6).distort(0.2)',
        uses: ['s', 'gain', 'crush', 'distort'],
      },
      noise: {
        label: 'Noise',
        code: 's("white").gain(0.08).lpf(4000).room(0.5)',
        uses: ['s', 'gain', 'lpf', 'room'],
      },
    },
  },
};

export const MUSIC_CONCEPTS = mergePatternLayers(BASE_MUSIC_CONCEPTS);

export function getConcept(conceptId) {
  return MUSIC_CONCEPTS[conceptId] || null;
}

export function getLayer(conceptId, variant = 'default') {
  const concept = getConcept(conceptId);
  if (!concept) return null;
  const layer = concept.layers[variant];
  if (layer) return { ...layer, concept: conceptId, variant };
  const first = Object.keys(concept.layers)[0];
  return first ? { ...concept.layers[first], concept: conceptId, variant: first } : null;
}

export function getFunctionDocs(functionIds) {
  return functionIds
    .map((id) => STRUDEL_FUNCTIONS[id])
    .filter(Boolean)
    .map((f) => `${f.signature} — ${f.description} e.g. ${f.example}`);
}

export function listConcepts() {
  return Object.values(MUSIC_CONCEPTS).map((c) => ({
    id: c.id,
    label: c.label,
    functions: c.functions,
    variants: Object.keys(c.layers),
  }));
}

export function listFunctions() {
  return Object.values(STRUDEL_FUNCTIONS);
}
