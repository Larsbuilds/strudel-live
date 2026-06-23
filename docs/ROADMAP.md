# Roadmap — strudel-live

**Aktuell: v0.6.0** — Vollständige Feature-Liste: [FEATURES.md](FEATURES.md) · v0.6 Plan: [V0.6-ROADMAP.md](V0.6-ROADMAP.md)

## Phase 1–6 — Kern ✅

- [x] KI Text → Strudel, Verfeinern, Speichern
- [x] Browser-Sprache + Whisper + `npm run voice`
- [x] MIDI-Geräteliste, Pattern `04-midi-ableton`
- [x] SuperDirt/OSC vorbereitet (`05-superdirt-osc`)
- [x] Mikrofon: Monitor / Autotune / Key-Sync
- [x] `npm run dev:full`, `npm run check`, Production-Build

## Phase 7–10 — DJ-Modus ✅ Basis

- [x] `sc:fetch`, `dj:analyze`, `dj:stems`, Manifest
- [x] `/api/transition`, DJ-Panel, Controller CC8/1/2
- [x] Ableton Link Clock-Sync (`/api/link`, Link-Sync UI)
- [ ] Essentia Cue-Points

## Phase 11–15 — Sound & Vision ✅ Basis

- [x] WAM-Host (OB-Xd, Dexed, Meld)
- [x] Faust Cloud API + AudioWorklet UI (`/api/faust`)
- [x] KI SynthDef + sclang (`/api/synthdef`)
- [x] RAVE Bridge (`rave:server`, 512/1024 PCM)
- [x] Hydra + KI-Shader (`/api/hydra`)
- [x] Stem-FFT → Hydra (geglättet α=0.2)
- [x] AI Conductor (`/api/conduct`) + Quantisierung

## Phase 16 — Live UX & Safety ✅ (v0.5.x)

- [x] **Ignite** — One-Prompt-Boot (`/api/ignite`)
- [x] **Prompt-Buch** — Club-Standard-Prompts
- [x] **Music Constraints** — deterministische Guardrails
- [x] **NOT-AUS** — UI + `npm run panic`
- [x] **Takt-Cue** — Countdown + Rand-Puls
- [ ] Z3 SMT optional (siehe [MUSIC-LOGIC.md](MUSIC-LOGIC.md))

## Phase 17 — v0.6.0 Orchestration ✅ (teilweise)

- [x] Multi-Agent Conductor (Audio / Video / Synth parallel)
- [x] Acorn Syntax-Guard (`code-validate.mjs`)
- [x] Ableton Link (`abletonlink` + `link-sync.js`)
- [x] RAVE ONNX (`onnxruntime-node`, `RAVE_MODEL_PATH`)
- [ ] Demo-Video + HN Release

- [ ] Gültiger `OPENAI_API_KEY` in `.env`
- [ ] Demucs (`pip install demucs`)
- [ ] SuperCollider für SynthDefs
- [ ] RAVE ONNX-Modell exportieren + Latenz &lt; 15 ms
- [ ] Faust-Service Zuverlässigkeit

## Docs

| Datei | Thema |
|-------|-------|
| [FEATURES.md](FEATURES.md) | Alles was gebaut ist |
| [WORKFLOW.md](WORKFLOW.md) | Schritt-für-Schritt |
| [PROMPT-BOOK.md](PROMPT-BOOK.md) | Club-Prompts |
| [SOUND-VISION.md](SOUND-VISION.md) | Phasen 11–15 |
| [DJ-ROADMAP.md](DJ-ROADMAP.md) | DJ 7–10 |
| [MUSIC-LOGIC.md](MUSIC-LOGIC.md) | Constraints / Isabelle vs Z3 |

## Tests

```bash
npm run check && npm run dev:full   # Terminal 1
npm run workflow:check && npm run audit
```
