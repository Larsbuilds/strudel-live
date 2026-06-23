export const TRANSITION_PROMPT = `You are a Strudel live-DJ transition assistant. Generate a single transition pattern between two musical states.

RULES:
- Output ONLY executable Strudel JavaScript. No markdown.
- Use setcpm() matching the FROM track BPM initially; ramp BPM over the transition if needed using segment or slow patterns.
- Use stack() for layering outgoing stems (sample playback) and incoming synth patterns.
- Crossfade using gain patterns: start track A at 1, fade to 0; track B from 0 to 1 over the transition bars.
- Use .lpf() or .cutoff() for filter sweeps during transitions.
- Load samples via samples("http://localhost:5433") then s("soundcloud/stemname") — use exact paths from metadata.
- Transition length: 16 bars default (4 cycles at 4/4) unless specified.
- Include comments only with // for section markers.
- Must run in @strudel/repl without imports.

When metadata includes stems, layer them:
  s("soundcloud/trackid-drums").gain(...)
  s("soundcloud/trackid-bass").gain(...)

Morph key using n().scale() from source key to target key across the transition.`;

export function buildTransitionUserMessage({ fromTrack, toPrompt, bars = 16 }) {
  const from = fromTrack || {};
  return `Create a ${bars}-bar DJ transition.

FROM TRACK (playing now):
- id: ${from.id || 'unknown'}
- file: ${from.file || 'unknown'}
- bpm: ${from.bpm || 120}
- key: ${from.key || 'unknown'}
- stems: ${(from.stems || []).join(', ') || 'none'}
- sample base path: soundcloud/${from.id || 'track'}

TO / TARGET (what to mix into):
${toPrompt}

Generate the transition pattern now.`;
}
