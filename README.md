# Strudel Live

Vollständiges KI-Live-Coding-System: **Text, Sprache, Whisper → Strudel → Sound** — plus MIDI zu Ableton, Autotune mit Key-Sync, eigene Samples.

**Repo:** https://github.com/Larsbuilds/strudel-live

## Schnellstart (Mac)

```bash
git clone https://github.com/Larsbuilds/strudel-live.git
cd strudel-live
npm install
npm run setup          # .env anlegen
# OPENAI_API_KEY in .env
npm run check          # Setup prüfen
npm run dev            # http://localhost:5173
```

## Features

| Feature | Wie |
|---------|-----|
| **KI Text → Musik** | Prompt → Generieren & Abspielen |
| **Verfeinern** | Checkbox + „mehr Reverb“, „nur Drums“ |
| **Pattern speichern** | Button → `patterns/generated/` |
| **🎤 Browser-Sprache** | Chrome, kein Extra-Key |
| **🎙 Whisper** | Bessere STT (braucht OpenAI-Key) |
| **Autotune** | Mikrofon → chromatisch oder Key-Sync mit KI-Pattern |
| **MIDI-Liste** | Zeigt IAC Driver / Geräte für `.midi("...")` |
| **Eigene Samples** | `npm run dev:full` |
| **CLI** | `npm run voice -- --prompt "techno beat"` |

## DJ-Modus (Phasen 7–10)

```bash
npm run dj:deps
npm run sc:fetch -- --url "https://soundcloud.com/artist/track"
npm run dj:analyze -- --track samples/soundcloud/track.wav
npm run dj:stems -- --track samples/soundcloud/track.wav   # optional, Demucs
npm run dev:full
```

Im Browser: **DJ-Modus** → Track wählen → **Übergang generieren**

Details: [docs/DJ-ROADMAP.md](docs/DJ-ROADMAP.md)

## NPM-Skripte

```bash
npm run dev          # Entwicklung (Port 5173)
npm run dev:full     # + Sample-Server (5432)
npm run build        # Production-Build
npm start            # Production (API + Static)
npm run check        # Setup validieren
npm run voice        # CLI: Text/Audio → Pattern
npm run sc:fetch     # SoundCloud/URL → samples/
npm run dj:analyze   # BPM-Analyse
npm run dj:stems     # Demucs Stem-Separation
npm run dj:deps      # DJ-Dependencies prüfen
npm run osc:check    # SuperDirt OSC prüfen
npm run superdirt:help
```

## Workflow-Beispiel

1. *„Trance 140 BPM, A-Moll, Saw-Lead“* → Generieren
2. Checkbox **Verfeinern** → *„mehr Delay und Reverb“*
3. **Pattern speichern**
4. Mikrofon → **Key-Sync** → dazu singen
5. Optional: Pattern `04-midi-ableton` → Akkorde in Ableton

## Architektur

```
Text / 🎤 / 🎙 Whisper
        ↓
   OpenAI / Claude
        ↓
   Strudel REPL ──┬── Browser-Audio
                  ├── MIDI → Ableton (IAC)
                  ├── OSC → SuperDirt
                  └── Mic → Autotune (Key-Sync)
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Docs

- [ROADMAP](docs/ROADMAP.md) — Phasen 1–6
- [MINI-NOTATION](docs/MINI-NOTATION.md)
- [MIDI-MAC](docs/MIDI-MAC.md)
- [SUPERCOLLIDER](docs/SUPERCOLLIDER.md)
- [GEMINI-EXTRACT](docs/GEMINI-EXTRACT.md)

## Mit Freunden

```bash
git clone https://github.com/Larsbuilds/strudel-live.git
npm install && npm run setup
# jeder eigener OPENAI_API_KEY in .env
npm run dev
```

## Lizenz

Patterns: eure Werke. Strudel: AGPL-3.0-or-later.
