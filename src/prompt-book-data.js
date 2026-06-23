/**
 * Club Prompt-Buch — Chips im UI + Referenz für docs/PROMPT-BOOK.md
 * Ignite-Modus: ein Prompt startet Strudel + Hydra + Module automatisch.
 */
export const PROMPT_CATEGORIES = [
  {
    id: 'trance',
    label: 'Trance & Euphoric',
    prompts: [
      {
        label: '90s Uplifting',
        text: '90s Trance, 140 BPM, euphoric uplifting, Saw-Lead und Pad in A-Moll, rollende Hi-Hats, blaue Neon-Visuals, langsame Kaleidoskop-Modulation',
        pattern: '02-trance-lead',
        expect: { bpm: 140, hydra: true, mic: false, mood: 'bright' },
      },
      {
        label: 'Acid Trance',
        text: 'Acid Trance 138 BPM, squelchy 303 Bassline, harte Kick, grüne pulsierende Hydra-Visuals, minimal Vocals',
        pattern: '13-acid-techno',
        expect: { bpm: 138, hydra: true },
      },
    ],
  },
  {
    id: 'techno',
    label: 'Techno & Deep',
    prompts: [
      {
        label: 'Deep Hypnotic',
        text: 'Hypnotic Deep Techno 128 BPM, dunkelrote Visuals, harte Kicks, subtiler Bass, ich will live dazu singen mit Key-Sync',
        pattern: '10-deep-techno',
        expect: { bpm: 128, hydra: true, mic: true },
      },
      {
        label: 'Minimal Berlin',
        text: 'Berlin Minimal Techno 125 BPM, trocken und reduziert, nur Drums und Clicks, schwarz-weiße minimalistische Visuals, kein Mic',
        pattern: '10-deep-techno',
        expect: { bpm: 125, hydra: true, mic: false },
      },
      {
        label: 'Peak-Time',
        text: 'Peak-Time Techno 132 BPM, aggressiver Drive, industrial Hi-Hats, rote stroboskopartige Hydra-Visuals',
        pattern: '10-deep-techno',
        expect: { bpm: 132, hydra: true },
      },
    ],
  },
  {
    id: 'hard',
    label: 'Hard & Industrial',
    prompts: [
      {
        label: 'Schranz',
        text: 'Industrial Schranz 150 BPM, verzerrte Kicks, metallische Percussion, flackerndes rot-schwarzes Stroboskop in Hydra, düster und aggressiv',
        pattern: '11-schranz',
        expect: { bpm: 150, hydra: true },
      },
      {
        label: 'Hard Techno',
        text: 'Hard Techno 145 BPM, distorted rumble bass, keine Melodie, glitchige schwarze Visuals, maximaler Druck',
        expect: { bpm: 145, hydra: true },
      },
    ],
  },
  {
    id: 'bass',
    label: 'DNB & Bass',
    prompts: [
      {
        label: 'Liquid DNB',
        text: 'Liquid Drum and Bass 174 BPM, warme Pads, synkopierter Break, cyan-blaue fließende Hydra-Visuals, sanft',
        pattern: '12-liquid-dnb',
        expect: { bpm: 174, hydra: true },
      },
      {
        label: 'Neurofunk',
        text: 'Neurofunk DNB 172 BPM, wobble bass, scharfe Drums, dunkle violette glitch Visuals',
        pattern: '03-dnb-break',
        expect: { bpm: 172, hydra: true },
      },
    ],
  },
  {
    id: 'ambient',
    label: 'Ambient & Downtempo',
    prompts: [
      {
        label: 'Ambient Drone',
        text: 'Ambient Drone 80 BPM, langsame Evolving Pads, kein Kick, weiche lila Visuals, viel Reverb, entspannt',
        pattern: '14-ambient-drone',
        expect: { bpm: 80, hydra: true, mic: false },
      },
      {
        label: 'Downtempo',
        text: 'Downtempo 95 BPM, lo-fi Beats, warme Rhodes, goldene sanfte Visuals, chillig',
        expect: { bpm: 95, hydra: true },
      },
    ],
  },
  {
    id: 'dj',
    label: 'DJ & Übergänge',
    prompts: [
      {
        label: 'Conductor Drop',
        text: 'Übergang jetzt düster und aggressiv — härtere Drums, tiefer Bass, rot-schwarzes Stroboskop',
        conductor: true,
      },
      {
        label: 'Vocal Underlay',
        text: 'Minimaler Gegenpart für die Vocals, 126 BPM, nur Pad und subtile Percussion, Visuals zurückhaltend',
        conductor: true,
      },
    ],
  },
  {
    id: 'refine',
    label: 'Verfeinern (läuft schon)',
    prompts: [
      { label: 'Mehr Reverb', text: 'mehr Reverb und Raum', refine: true },
      { label: 'Nur Drums', text: 'nur Drums, kein Lead', refine: true },
      { label: 'Härter', text: 'härter und aggressiver, mehr Distortion', refine: true },
      { label: 'Langsamer', text: 'langsamerer Filter-Sweep, weniger Hi-Hats', refine: true },
    ],
  },
];

/** Flache Liste für einfache Chip-Leiste (erste Prompts pro Kategorie + Refine). */
export const QUICK_CHIPS = PROMPT_CATEGORIES.flatMap((cat) =>
  cat.prompts.slice(0, cat.id === 'refine' ? 4 : 1).map((p) => ({
    ...p,
    category: cat.label,
  })),
);

export const CONDUCTOR_PROMPTS = PROMPT_CATEGORIES.filter((c) => c.id === 'dj').flatMap((c) => c.prompts);
