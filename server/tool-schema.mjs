/** Shared tool schema for LLM prompts (no imports — avoids circular deps). */
export const TOOL_SCHEMA = `Available tools (output JSON {"tools":[...]} OR Strudel code):
- append_layer { "concept": "bass|drums|acid|pad|lead|stab|fx|groove|texture", "variant": "sub|kick|hats|..." }
- remove_layer { "concept": "bass|drums|pad|lead|...", "variant": "sub|snare|hats|kick|..." }
- set_bpm { "bpm": 128 }
- load_preset { "presetId": "10-deep-techno" }

Concepts map to Strudel catalog layers — you do NOT need to write syntax for append_layer/remove_layer.`;
