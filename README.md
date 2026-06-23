# Strudel Live

**KI-Live-DJ & Live-Coding:** Ein Prompt → Strudel + Hydra + Mic + Stems + WAM — quantisiert, mit NOT-AUS.

**Repo:** https://github.com/Larsbuilds/strudel-live · **Version:** 0.6.0

## Schnellstart

```bash
git clone https://github.com/Larsbuilds/strudel-live.git
cd strudel-live
npm install && npm run setup
# OPENAI_API_KEY in .env
npm run check
npm run dev:full          # App :5173 + Samples :5432
```

→ http://localhost:5173 → **Prompt-Buch-Chip** oder Text → **Ignite & Start**

## Was drin ist (Kurz)

| Bereich | Highlights |
|---------|------------|
| **Ignite** | Ein Prompt bootet Strudel + Hydra + Mic/RAVE/WAM automatisch |
| **DJ** | SoundCloud → Analyse → Demucs-Stems → KI-Übergänge |
| **Vision** | Hydra KI-Shader, Stem-FFT (`window.dj_stems`) |
| **Conductor** | Ein Prompt → Strudel + WAM + Hydra auf der Eins |
| **Safety** | NOT-AUS (`npm run panic`), Takt-Countdown, **Ableton Link** |
| **Voice** | Browser-Sprache, Whisper, Autotune, Key-Sync |

**Vollständige Liste:** [docs/FEATURES.md](docs/FEATURES.md)

## Club-Prompts

[docs/PROMPT-BOOK.md](docs/PROMPT-BOOK.md) — z. B. *90s Trance 140 BPM blaue Neon* vs. *Industrial Schranz 150 BPM Stroboskop*

## DJ-Workflow

```bash
npm run dj:deps
npm run sc:fetch -- --url "https://soundcloud.com/…"
npm run dj:analyze -- --track samples/soundcloud/track.wav
npm run dj:stems -- --track samples/soundcloud/track.wav   # optional
npm run dev:full
```

→ DJ-Modus → Track → Stem-FFT → Conductor

Details: [docs/DJ-ROADMAP.md](docs/DJ-ROADMAP.md) · [docs/WORKFLOW.md](docs/WORKFLOW.md)

## Sound & Vision

| Phase | Feature |
|-------|---------|
| 11 | WAM (OB-Xd, Dexed, Meld) |
| 11b | Faust → WASM AudioWorklet |
| 12 | KI → SuperCollider SynthDef |
| 13 | RAVE WebSocket + ONNX (`npm run rave:server`, `RAVE_MODEL_PATH`) |
| 14 | Hydra + Stem-FFT |
| 15 | AI Conductor |

[docs/SOUND-VISION.md](docs/SOUND-VISION.md)

## NPM-Skripte

```bash
npm run dev:full         # Entwicklung + Samples
npm run build && npm start   # Production
npm run check            # Setup
npm run workflow:check   # API-Integration
npm run audit            # Doku + Module + APIs
npm run panic            # Remote NOT-AUS
npm run voice            # CLI Voice-Jam
npm run sc:fetch         # SoundCloud/URL
npm run dj:analyze       # BPM
npm run dj:stems         # Demucs
npm run synthdef         # SC SynthDef CLI
npm run osc:synthdef     # Alias synthdef CLI
npm run rave:server      # RAVE :8765
npm run rave:help        # RAVE Info
npm run link:status      # Ableton Link BPM/Beat
npm run samples          # Nur Sample-Server :5432
npm run patterns         # Pattern-Liste
npm run preview          # build + start
```

## APIs

`generate` · `ignite` · `conduct` · `transition` · `hydra` · `synthdef` · `faust` · `transcribe` · `panic` · `link` · `dj/manifest`

Siehe [docs/FEATURES.md](docs/FEATURES.md#alle-api-endpunkte)

## Dokumentation

| Doc | Inhalt |
|-----|--------|
| [FEATURES.md](docs/FEATURES.md) | Master-Feature-Liste |
| [ROADMAP.md](docs/ROADMAP.md) | Phasen-Status |
| [PROMPT-BOOK.md](docs/PROMPT-BOOK.md) | Club-Prompts |
| [WORKFLOW.md](docs/WORKFLOW.md) | End-to-End |
| [MUSIC-LOGIC.md](docs/MUSIC-LOGIC.md) | Constraints, kein Isabelle |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System |
| [MIDI-MAC.md](docs/MIDI-MAC.md) | Ableton-Routing |
| [SUPERCOLLIDER.md](docs/SUPERCOLLIDER.md) | SuperDirt |

## Architektur (vereinfacht)

```
Prompt / 🎤 / 🎙
      ↓
  /api/ignite | /api/conduct | /api/generate
      ↓
 workflow-hub → Strudel REPL
      ├→ Hydra (Stem-FFT)
      ├→ WAM / Faust / RAVE
      ├→ MIDI → Ableton
      ├→ OSC → SuperCollider
      └→ Mic → Autotune (Key-Sync)
```

## Lizenz

Patterns: eure Werke. Strudel-Packages: AGPL-3.0-or-later.
