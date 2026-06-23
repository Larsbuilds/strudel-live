# Feature-Übersicht — strudel-live v0.6.0

**Master-Liste** alles, was gebaut ist. Stand: ein Repo, ~2 Wochen Entwicklung.

**Repo:** https://github.com/Larsbuilds/strudel-live

---

## Kern (Phasen 1–6)

| Feature | UI / CLI | API | Datei |
|---------|----------|-----|-------|
| Strudel REPL | Browser | — | `@strudel/repl`, `index.html` |
| KI Text → Pattern | Generieren / Ignite | `POST /api/generate` | `server/generate.mjs` |
| Verfeinern | Erweitert → Checkbox | `previousCode` in generate | `src/ai-panel.js` |
| Pattern speichern | Button | `POST /api/save-pattern` | `server/save-pattern.mjs` |
| Browser-Sprache | 🎤 | — | `src/voice-input.js` |
| Whisper STT | 🎙 | `POST /api/transcribe` | `src/whisper-recorder.js` |
| Voice CLI | — | — | `npm run voice` |
| MIDI-Geräteliste | Advanced Panel | — | `src/midi-panel.js` |
| Mikrofon Monitor | Advanced | — | `src/mic-panel.js` |
| Autotune | Mic-Modus | — | Tone.js + pitchy |
| Key-Sync | Mic-Modus | — | `session.js` + `.scale()` |
| Sample-Server | — | — | `npm run dev:full` → :5432 |
| Setup-Check | — | — | `npm run check` |
| Production | — | Express | `npm run build && npm start` |

---

## DJ-Modus (Phasen 7–10)

| Feature | CLI | API | Datei |
|---------|-----|-----|-------|
| SoundCloud/URL Ingest | `npm run sc:fetch` | — | `scripts/sc-fetch.mjs` |
| Track-Manifest | — | `GET /api/dj/manifest` | `samples/manifest.json` |
| BPM-Analyse | `npm run dj:analyze` | — | `scripts/dj-analyze.mjs` |
| Demucs Stems | `npm run dj:stems` | — | `scripts/dj-stems.mjs` |
| KI-Übergang | DJ-Panel | `POST /api/transition` | `server/transition.mjs` |
| DJ-Controller MIDI | CC8/1/2 | — | `src/dj-controller.js` |
| Patterns 07–08 | Dropdown | — | `patterns/07-dj-stems.strudel` |

---

## Sound & Vision (Phasen 11–15)

| Phase | Feature | API | Frontend |
|-------|---------|-----|----------|
| 11a | WAM Host (OB-Xd, Dexed, Meld) | — | `src/wam-host.js` |
| 11b | Faust Cloud → AudioWorklet | `POST /api/faust` | `src/faust-host.js` |
| 12 | KI SuperCollider SynthDef | `POST /api/synthdef` | `src/synthdef-panel.js` |
| 12 | sclang send | `POST /api/synthdef/send` | `server/sc-send.mjs` |
| 13 | RAVE WebSocket Bridge | — | `npm run rave:server`, `src/rave-client.js` |
| 14 | Hydra + KI-Shader | `POST /api/hydra` | `src/hydra-panel.js` |
| 14 | Stem-FFT → Hydra (α=0.2) | — | `src/stem-analyser.js` |
| 15 | AI Conductor (sync) | `POST /api/conduct` | `src/conductor-panel.js` |
| 15 | WAM-Automation | in conduct JSON | `src/wam-automation.js` |

---

## v0.5.x Live-Safety & UX

| Feature | UI / CLI | Datei |
|---------|----------|-------|
| **Ignite** (One-Prompt-Boot) | Ignite & Start | `POST /api/ignite`, `src/ignite-boot.js` |
| **Prompt-Buch** | Kategorisierte Chips | `docs/PROMPT-BOOK.md`, `src/prompt-book-data.js` |
| **Music Constraints** | auto bei Ignite/Conduct | `server/music-constraints.mjs` |
| **Acorn Syntax-Guard** | KI-Code vor REPL | `server/code-validate.mjs` |
| **Multi-Agent Conductor** | 3 parallele LLM-Agents | `CONDUCTOR_ORCHESTRATION=multi` |
| **NOT-AUS** | Roter Button, Cmd+Esc | `npm run panic`, `src/panic.js` |
| **Takt-Cue** | Rand-Puls + Countdown | `src/quantize-cue.js` |
| **Quantisierung** | Conductor auf Eins | `src/strudel-quantize.js` |
| **Workflow-Hub** | zentrale Pattern-Anwendung | `src/workflow-hub.js` |

---

## v0.6.0 Club-Sync & RAVE

| Feature | UI / CLI | API | Datei |
|---------|----------|-----|-------|
| **Ableton Link** | Link-Sync Toggle | `GET/POST /api/link` | `server/link-clock.mjs`, `src/link-sync.js` |
| **Link Status** | Header-Anzeige | — | `npm run link:status` |
| **RAVE ONNX** | Passthrough oder Modell | WebSocket :8765 | `server/rave-onnx.mjs`, `RAVE_MODEL_PATH` |

---

## Alle API-Endpunkte

| Methode | Pfad | Zweck |
|---------|------|-------|
| GET | `/api/health` | Setup-Status, Version, Tools |
| GET | `/api/status` | AI-Provider-Status |
| GET | `/api/patterns` | Pattern-Liste |
| POST | `/api/generate` | Strudel aus Prompt |
| POST | `/api/ignite` | One-Prompt Boot-Manifest |
| POST | `/api/transcribe` | Whisper STT |
| POST | `/api/save-pattern` | Pattern speichern |
| GET | `/api/dj/manifest` | DJ-Tracks |
| POST | `/api/transition` | KI-Übergang |
| POST | `/api/conduct` | Conductor (Strudel+WAM+Hydra) |
| POST | `/api/synthdef` | SC SynthDef generieren |
| POST | `/api/synthdef/send` | An sclang senden |
| POST | `/api/hydra` | Hydra-Shader generieren |
| POST | `/api/faust` | Faust → WASM |
| GET/POST | `/api/panic` | NOT-AUS Signal |
| GET/POST | `/api/link` | Ableton Link BPM/Beat |

---

## NPM-Skripte (vollständig)

```bash
npm run dev              # Vite :5173
npm run dev:full         # App + Samples :5432
npm run build            # Production-Build
npm run start            # Express Production
npm run setup            # .env anlegen
npm run check            # Setup-Validator
npm run workflow:check   # API-Integration
npm run audit            # Doku + Module + APIs
npm run voice            # CLI Voice-Jam
npm run sc:fetch         # SoundCloud/URL
npm run dj:analyze       # BPM
npm run dj:stems         # Demucs
npm run dj:deps          # DJ-Deps prüfen
npm run synthdef         # SC SynthDef CLI
npm run rave:server      # RAVE WebSocket :8765
npm run rave:help        # RAVE Info
npm run link:status      # Ableton Link BPM/Beat
npm run panic            # Remote NOT-AUS
npm run osc:check        # SuperDirt OSC
npm run superdirt:help   # SC Install-Hilfe
```

---

## Dokumentation (Index)

| Datei | Inhalt |
|-------|--------|
| [README.md](../README.md) | Schnellstart, Übersicht |
| [FEATURES.md](FEATURES.md) | Diese Datei |
| [ROADMAP.md](ROADMAP.md) | Phasen-Status |
| [WORKFLOW.md](WORKFLOW.md) | End-to-End Workflows |
| [PROMPT-BOOK.md](PROMPT-BOOK.md) | Club-Prompts |
| [DJ-ROADMAP.md](DJ-ROADMAP.md) | DJ-Phasen 7–10 |
| [SOUND-VISION.md](SOUND-VISION.md) | Phasen 11–15 |
| [MUSIC-LOGIC.md](MUSIC-LOGIC.md) | Constraints, Isabelle vs Z3 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Systemdiagramm |
| [MIDI-MAC.md](MIDI-MAC.md) | IAC Driver |
| [SUPERCOLLIDER.md](SUPERCOLLIDER.md) | SuperDirt |
| [MINI-NOTATION.md](MINI-NOTATION.md) | Strudel-Syntax |
| [V0.6-ROADMAP.md](V0.6-ROADMAP.md) | Szenen-Vergleich, v0.6 Plan |
| [ABLETON-LINK.md](ABLETON-LINK.md) | Link-Setup, API |

---

## Bekannte Lücken (ehrlich)

| Item | Status |
|------|--------|
| OPENAI_API_KEY gültig | manuell prüfen (401 möglich) |
| Faust Cloud Service | oft langsam/offline |
| RAVE GPU-Inferenz | ONNX wenn `RAVE_MODEL_PATH` gesetzt, sonst Passthrough |
| Ableton Link | `abletonlink` im Server + Link-Sync UI |
| Essentia Cue-Points | nicht implementiert |
| Z3 SMT-Solver | dokumentiert, nicht integriert |
| Isabelle | bewusst nicht |

---

## Tests

```bash
npm run check           # Tools + .env
npm run workflow:check  # APIs + Imports (Dev-Server nötig)
npm run audit           # Doku + Module + APIs + Build
npm run build           # Production-Build
```
