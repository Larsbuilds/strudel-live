/** Human-readable labels for the pattern dropdown. */
export const PATTERN_LABELS = {
  '01-kick-snare': '01 — Grundbeat (nur Kick + Snare, Demo)',
  '02-trance-lead': '02 — Trance Lead + Drums',
  '03-dnb-break': '03 — DNB Breakbeat',
  '04-midi-ableton': '04 — MIDI → Ableton (IAC Driver)',
  '05-superdirt-osc': '05 — SuperCollider / SuperDirt',
  '06-local-samples': '06 — Eigene Samples (:5433)',
  '07-dj-stems': '07 — DJ-Stems aus Manifest',
  '08-dj-controller': '08 — DJ-Controller MIDI (CC8/1/2)',
  '09-hydra-live': '09 — Strudel + Hydra zusammen',
  '10-deep-techno': '10 — Deep Techno (Club-Preset) ★',
  '11-schranz': '11 — Schranz Industrial ★',
  '12-liquid-dnb': '12 — Liquid DNB ★',
  '13-acid-techno': '13 — Acid 303 ★',
  '14-ambient-drone': '14 — Ambient Drone ★',
  '15-stem-reactive': '15 — Stem-FFT reaktiv ★',
};

export function labelForPattern(name) {
  if (PATTERN_LABELS[name]) return PATTERN_LABELS[name];
  if (name.startsWith('generated/')) return `✨ ${name.replace('generated/', 'KI: ')}`;
  return name;
}
