# Sound & Vision — Phasen 11–15 (v0.5.4)

Unabhängigkeit von externen DAWs: WASM-Synths, SuperCollider-SynthDefs, Neural Audio (später), Hydra-Visuals.

## Phase 11 — Web Audio Modules (WAMs) ✅ Basis

Open-Source WASM-Synthesizer direkt im Browser laden.

| Plugin | Quelle |
|--------|--------|
| OB-Xd | [webaudiomodules.org/wamsynths](https://webaudiomodules.org/wamsynths/) |
| Dexed | WAM Community |

**Im UI:** Sound & Vision → WAM-Plugin wählen → **Laden**

Steuerung aus Strudel: MIDI an WAM-Output oder Pattern mit `.midi()` + externes Routing.

Faust/WASM live-Kompilierung: **Phase 11b** — Cloud-API (`POST /api/faust`), siehe unten.

## Phase 12 — SuperCollider SynthDef Generator ✅ Basis

```
Prompt → KI → SuperCollider SynthDef → sclang / OSC → SuperDirt
```

```bash
# SynthDef generieren (CLI)
npm run synthdef -- --prompt "dreckiger morphing cyberpunk bass"

# An SuperCollider senden (sclang muss laufen)
npm run osc:synthdef -- --file patterns/generated/my-synth.scd
```

Im UI: **SynthDef generieren** → Code anzeigen → **An SC senden**

Voraussetzung: SuperCollider + SuperDirt (`docs/SUPERCOLLIDER.md`)

## Phase 13 — RAVE Neural Audio ○ Bridge

Echtzeit-Stimme → Neural-Synth via RAVE (GPU, Python).

```bash
npm run rave:server   # WebSocket :8765 — Browser PCM ↔ Node ↔ Python GPU
npm run rave:help
```

`server/rave-worker.py` — Platzhalter für PyTorch/RAVE `.to('cuda')`.

**Browser:** PCM-Frames 512 oder 1024 Samples (`rave-client.js`) — nicht 256 (Knackser) oder 2048+ (Latency).

## Phase 14 — Hydra Visuals ✅ Basis

```bash
# Im Browser: Sound & Vision → Hydra starten
# KI-Visuals: Prompt → Shader-Code → Ausführen
```

- `detectAudio: true` — reagiert auf Mikrofon/Browser-Audio
- `feedStrudel: true` — Strudel-Canvas als Hydra-Quelle
- KI generiert Hydra-Syntax (`osc`, `noise`, `modulate`, `out`)

Pattern `09-hydra-live` — Strudel + Hydra zusammen

### Stem-FFT → Hydra ✅ (v0.5.0)

Pro Demucs-Stem ein `AnalyserNode` (drums/bass/vocals/other). Im DJ-Modus: **Stem-FFT für Hydra starten**.

```javascript
// KI-generierter Hydra-Code
osc(10, 0.1, () => window.dj_stems.bass() * 3)
  .modulate(noise(3), () => window.dj_stems.drums() * 0.5)
  .out()
```

Voraussetzung: `npm run dj:stems` + `npm run dev:full` (Sample-Server :5432).

Stem-Werte werden exponentiell geglättet (`α=0.2`) — `window.dj_stems` (smooth) vs. `window.dj_stems_raw` (roh).

## Phase 15 — AI Performance Conductor ✅ Basis

Ein Prompt steuert **gleichzeitig**:

| Output | API-Feld |
|--------|----------|
| Strudel-Pattern | `strudel` |
| WAM-Automation | `wam` (cutoff, resonance, gain, distortion) |
| Hydra-Shader | `hydra` |

```
POST /api/conduct
{ "prompt": "düster und aggressiv", "fromTrack": {…}, "stemLevels": "…" }
```

Im UI: DJ-Modus → **Conductor ausführen** (Strudel-Wechsel quantisiert auf nächste Eins).

## Phase 11b — Faust Cloud Compiler ✅

```
POST /api/faust
{ "code": "process = _;", "name": "myDsp" }
```

Kompiliert via [faustservice.grame.fr](https://faustservice.grame.fr/) → WASM + Worklet.

**Im UI:** Sound & Vision → Faust-Code → **Kompilieren & laden** (AudioWorkletNode).

## Architektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Strudel REPL│────▶│ Hydra Canvas │     │ WAM Synth   │
└──────┬──────┘     └──────────────┘     └─────────────┘
       │ OSC / samples
       ▼
┌─────────────┐
│ SuperCollider│ ← KI SynthDefs
└─────────────┘
```

## KI-Prompt-Erweiterung

Die APIs `/api/hydra`, `/api/synthdef` und `/api/conduct` nutzen eigene System-Prompts.
`/api/generate` bleibt für Verfeinern-only. `/api/ignite` für One-Prompt-Boot.

## v0.5.x — Ignite, Safety, UX

| Feature | Doku |
|---------|------|
| Ignite (`/api/ignite`) | [WORKFLOW.md](WORKFLOW.md) |
| Prompt-Buch | [PROMPT-BOOK.md](PROMPT-BOOK.md) |
| Music Constraints | [MUSIC-LOGIC.md](MUSIC-LOGIC.md) |
| NOT-AUS | `npm run panic`, UI-Button |
| Takt-Cue + Quantisierung | `strudel-quantize.js`, `quantize-cue.js` |

Vollständig: [FEATURES.md](FEATURES.md)
