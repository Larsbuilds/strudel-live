/** Client-side scale helpers (mirrors server/parse-scale.mjs). */

const NOTE_OFFSETS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  'pentatonic minor': [0, 3, 5, 7, 10],
};

const SCALE_RE = /\.scale\(\s*['"]([^'"]+)['"]\s*\)/i;
const CHORD_RE = /chord\(\s*['"]([^'"]+)['"]\s*\)/i;

function parseRootNote(scaleStr) {
  const colon = scaleStr.trim().match(/^([A-Ga-g][#b]?):(\w[\w\s-]*)$/);
  if (colon) {
    const letter = colon[1][0].toLowerCase();
    const accidental = colon[1].slice(1);
    const modeRaw = colon[2].toLowerCase();
    let root = NOTE_OFFSETS[letter] ?? 0;
    if (accidental === '#') root += 1;
    if (accidental === 'b') root -= 1;
    const mode = modeRaw.includes('minor') || modeRaw === 'min' ? 'minor' : modeRaw;
    return { root: ((root % 12) + 12) % 12, mode };
  }

  const match = scaleStr.trim().match(/^([A-Ga-g])([#b]?)(\d+)?\s*(.*)$/);
  if (!match) return { root: 9, octave: 2, mode: 'minor' };
  const letter = match[1].toLowerCase();
  const accidental = match[2];
  const modeRaw = (match[4] || 'major').toLowerCase();
  let root = NOTE_OFFSETS[letter] ?? 0;
  if (accidental === '#') root += 1;
  if (accidental === 'b') root -= 1;
  const mode = modeRaw.includes('minor') || modeRaw === 'min' ? 'minor' : modeRaw;
  return { root: ((root % 12) + 12) % 12, mode };
}

export function parseScaleFromCode(code) {
  const scaleMatch = code.match(SCALE_RE);
  if (scaleMatch) {
    const { root, mode } = parseRootNote(scaleMatch[1]);
    const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS.minor;
    return { source: 'scale', label: scaleMatch[1], root, intervals };
  }
  const chordMatch = code.match(CHORD_RE);
  if (chordMatch) {
    const first = chordMatch[1].match(/[A-G][#b]?/i)?.[0] ?? 'C';
    const isMinor = /m(?!aj)/i.test(chordMatch[1]);
    const { root } = parseRootNote(`${first} ${isMinor ? 'minor' : 'major'}`);
    return {
      source: 'chord',
      label: chordMatch[1],
      root,
      intervals: isMinor ? SCALE_INTERVALS.minor : SCALE_INTERVALS.major,
    };
  }
  return null;
}

export function freqToMidi(freq) {
  if (!freq || freq < 20) return null;
  return 69 + 12 * Math.log2(freq / 440);
}

export function snapMidiToScale(midi, scale) {
  if (!scale) return midi;
  const { root, intervals } = scale;
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  const octave = Math.floor(midi / 12);
  let best = pitchClass;
  let bestDist = 99;
  for (const interval of intervals) {
    const candidate = (root + interval) % 12;
    const dist = Math.min(Math.abs(candidate - pitchClass), 12 - Math.abs(candidate - pitchClass));
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  let snapped = octave * 12 + best;
  if (Math.abs(snapped - midi) > 6) snapped += midi < snapped ? -12 : 12;
  return snapped;
}
