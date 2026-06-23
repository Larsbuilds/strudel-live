# Sound & Vision — Phasen 11–14 (v0.4.0)

Unabhängigkeit von externen DAWs: WASM-Synths, SuperCollider-SynthDefs, Neural Audio (später), Hydra-Visuals.

## Phase 11 — Web Audio Modules (WAMs) ✅ Basis

Open-Source WASM-Synthesizer direkt im Browser laden.

| Plugin | Quelle |
|--------|--------|
| OB-Xd | [webaudiomodules.org/wamsynths](https://webaudiomodules.org/wamsynths/) |
| Dexed | WAM Community |

**Im UI:** Sound & Vision → WAM-Plugin wählen → **Laden**

Steuerung aus Strudel: MIDI an WAM-Output oder Pattern mit `.midi()` + externes Routing.

Faust/WASM live-Kompilierung: **Phase 11b** (braucht Faust-Toolchain) — dokumentiert, nicht automatisiert.

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

## Phase 13 — RAVE Neural Audio ○ Vorbereitet

Echtzeit-Stimme → Industrial-Gitarre/Chor via RAVE-Modelle (GPU, Python).

```bash
npm run rave:help
```

Noch keine Browser-Integration — zu schwergewichtig für v0.4.0.

## Phase 14 — Hydra Visuals ✅ Basis

```bash
# Im Browser: Sound & Vision → Hydra starten
# KI-Visuals: Prompt → Shader-Code → Ausführen
```

- `detectAudio: true` — reagiert auf Mikrofon/Browser-Audio
- `feedStrudel: true` — Strudel-Canvas als Hydra-Quelle
- KI generiert Hydra-Syntax (`osc`, `noise`, `modulate`, `out`)

Pattern `09-hydra-live` — Strudel + Hydra zusammen

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

Die APIs `/api/hydra` und `/api/synthdef` nutzen eigene System-Prompts.
`/api/generate` bleibt für Strudel-Patterns.
