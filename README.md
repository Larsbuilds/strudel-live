# Strudel Live

KI-gesteuertes Live-Coding mit [Strudel](https://strudel.cc) — Text oder Sprache rein, Musik raus. Erweiterbar mit MIDI (Ableton), eigenen Samples und SuperDirt.

**Repo:** https://github.com/Larsbuilds/strudel-live

## Schnellstart (Mac)

```bash
git clone https://github.com/Larsbuilds/strudel-live.git
cd strudel-live
npm install
npm run setup          # erstellt .env
# OPENAI_API_KEY in .env eintragen
npm run dev            # → http://localhost:5173
```

1. Einmal in die Seite klicken (Audio-Freigabe)
2. Text eingeben oder **🎤 Sprechen** (Chrome, kein Extra-Key)
3. **Generieren & Abspielen**

## Was dieses Setup kann

| Feature | Befehl / Ort |
|---------|----------------|
| **KI: Text → Musik** | Prompt oben im Browser |
| **Sprache → Text** | 🎤 Button (Web Speech API) |
| **Starter-Patterns** | Dropdown (Trance, DNB, …) |
| **Eigene Samples** | `npm run dev:full` + Dateien in `samples/` |
| **MIDI → Ableton** | Pattern `04-midi-ableton` + `docs/MIDI-MAC.md` |
| **SuperDirt / OSC** | `docs/SUPERCOLLIDER.md` |
| **Mikrofon-Monitor** | „Erweitert“ im UI (Basis für Autotune) |

## NPM-Skripte

```bash
npm run dev        # REPL + KI (Port 5173)
npm run samples    # Sample-Server (Port 5432)
npm run dev:full   # Beides parallel
npm run patterns   # Pattern-Liste
npm run setup      # .env anlegen
```

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Gesamtsystem, Schichten, Diagramm |
| [docs/GEMINI-EXTRACT.md](docs/GEMINI-EXTRACT.md) | Was aus KI-Chats stimmt / falsch ist |
| [docs/MINI-NOTATION.md](docs/MINI-NOTATION.md) | Spickzettel `[ ] * < >` |
| [docs/MIDI-MAC.md](docs/MIDI-MAC.md) | IAC Driver → Ableton |
| [docs/SUPERCOLLIDER.md](docs/SUPERCOLLIDER.md) | OSC / SuperDirt |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phasen 1–6 |

## Strudel ≠ Ableton (kurz)

Strudel ersetzt keine DAW — es ist das **algorithmische Gehirn** (Patterns live ändern). Ableton/Serum liefern den **Sound** via MIDI. Switch Angel nutzt beides.

## KI-Provider

| Provider | Variable | Modell |
|----------|----------|--------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |

Key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

## Gemini-Warnung

Diese Pakete sind **nicht** Musik-Strudel:

- `strudel-cli` (npm) — altes JS-Framework 2018
- `strudel-science/strudel-kit` — wissenschaftliches UI-Toolkit

Wir nutzen `@strudel/*` von [strudel.cc](https://strudel.cc).

## Mit Freunden jammen

1. Repo klonen, `npm install`, `.env` mit eigenem Key
2. Patterns in `patterns/` pushen (erscheinen automatisch im Dropdown)
3. Optional: MIDI-Setup teilen (`docs/MIDI-MAC.md`)

## Lizenz

Patterns: eure Werke. Strudel-Pakete: AGPL-3.0-or-later.
