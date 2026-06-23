import { SYSTEM_PROMPT } from './system-prompt.mjs';
import { HYDRA_PROMPT } from './hydra-prompt.mjs';

export const AUDIO_AGENT_PROMPT = `${SYSTEM_PROMPT}

ROLE: Audio agent only. Output ONLY executable Strudel JavaScript.
No markdown. No JSON. No hydra. No explanation.
Must include setcpm() when BPM is known.`;

export const VIDEO_AGENT_PROMPT = `${HYDRA_PROMPT}

ROLE: Video agent only. Output ONLY Hydra shader code ending with .out().
No markdown. No Strudel. No JSON.`;

export const SYNTH_AGENT_PROMPT = `You are a WAM synthesizer automation agent for a live DJ system.

Output ONLY valid JSON: { "cutoff": 0.0-1.0, "resonance": 0.0-1.0, "gain": 0.0-1.0, "distortion": 0.0-1.0 }

Rules:
- aggressive/dark/industrial → low cutoff, high distortion
- ambient/soft → high cutoff, low distortion, moderate gain
- Omit keys you don't need to change`;
