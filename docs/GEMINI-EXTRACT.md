# Was aus dem Gemini-Chat stimmt — und was nicht

Kurzfassung der zweiten Chat-Runde, gefiltert für **strudel-live**.

## Stimmt und ist relevant

| Thema | Kernaussage | In diesem Repo |
|-------|-------------|----------------|
| **Strudel ≠ Ableton/Logic** | Timeline-DAW vs. algorithmische Patterns — Profis **kombinieren** beides | `docs/ARCHITECTURE.md` |
| **MIDI-Out** | Strudel steuert Serum, Vital, Hardware via `.midi()` | `patterns/04-midi-ableton.strudel`, `docs/MIDI-MAC.md` |
| **SuperDirt / OSC** | Studio-Sound über SuperCollider statt Browser-Synth | `patterns/05-superdirt-osc.strudel`, `docs/SUPERCOLLIDER.md` |
| **Mini-Notation** | `[ ]`, `*`, `< >`, `~` — Kern der Sprache | `docs/MINI-NOTATION.md` |
| **Eigene Samples** | Lokaler Sample-Server statt nur Cloud-Samples | `npm run samples`, Ordner `samples/` |
| **KI-Pipeline** | Text/Sprache → LLM → Strudel-Code | Bereits eingebaut (`src/ai-panel.js`) |
| **Mikrofon + Code** | Web Audio kann Input verarbeiten; Tonart mit Pattern syncen ist möglich | `src/mic-panel.js` (Monitor jetzt, Autotune später) |

## Falsch oder irreführend (ignorieren)

| Gemini sagte | Realität |
|--------------|----------|
| `strudel-kit` für lokales Projekt | **Wissenschaftliches React-UI-Toolkit**, nicht Musik-Strudel |
| `strudel-cli` + KI schreibt in laufende CLI | **Altes JS-Scaffold von 2018**, nicht tidalcycles/strudel |
| Pseudocode-Autotune mit `createAutotuneEffect` | Kein Standard in Strudel — braucht eigene Web-Audio-/DSP-Lib |
| PitchToggle-Link über Google-Search | Nutzlose URL — echte Projekte: Tone.js, AudioWorklet, [cwilso/PitchToggle](https://github.com/cwilso/PitchToggle) |

## Phase 7–10 — DJ-Modus (neu)

| Gemini-Idee | Umsetzung |
|-------------|-----------|
| SoundCloud-Ingestion | `npm run sc:fetch` via **yt-dlp** (nicht kaputte SC-API) |
| Stem-Separation | `npm run dj:stems` via **Demucs** (Python, optional) |
| BPM/Key-Analyse | `npm run dj:analyze` (music-tempo + ffmpeg) |
| KI-Übergänge | `/api/transition` + DJ-Panel |
| DJ-Controller | Web MIDI CC-Mapping |
| Ableton Link | **Noch nicht** — `setcpm()` aus Manifest-BPM als Bridge |

Falsch/übertrieben: „fertige Songs streamen“ als Produkt — wir cachen lokal für Jams. Essentia Cue-Points noch offen.

Details: `docs/DJ-ROADMAP.md`

## Unser Fahrplan (Phasen 1–10)

```
Phase 1  Lernen          Workshop + Mini-Notation
Phase 2  Lokal           AI-Text→Sound, eigene Samples
Phase 3  Pro-Sound       MIDI → Ableton/Synths (IAC Driver Mac)
Phase 4  Studio          SuperCollider + SuperDirt via OSC
Phase 5  Stimme          Browser-Speech + Whisper (optional)
Phase 6  Gesang          Mic-Monitor → Pitch-Correction → Key-Sync mit Pattern
```

Siehe `docs/ROADMAP.md` für Details und Checkboxen.
