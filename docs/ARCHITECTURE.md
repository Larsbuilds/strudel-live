# System-Architektur

Wie **strudel-live** in ein größeres Setup passt — inspiriert von Switch Angel und der Algorave-Szene.

## Strudel ersetzt keine DAW

| | Ableton / Logic | Strudel |
|---|----------------|---------|
| Paradigma | Timeline, Clips, Automation mit Maus | Algorithmen, Patterns, Live-Code |
| Stärke | Mixing, Mastering, Songwriting | Generative Rhythmen, Polyrhythmen, mathematische Strukturen |
| Sound | Plugins, Audio-Recording | Browser-Synth (SuperDough) oder extern via MIDI/OSC |

**Profi-Workflow:** Strudel = Gehirn (Noten/Rhythmen live ändern), DAW/Synths = Klang (Serum, Analog Rytm, etc.).

## Schichten in diesem Projekt

```mermaid
flowchart TB
  subgraph input [Eingabe]
    Text[Text-Prompt]
    Voice[Browser-Sprache]
    Mic[Mikrofon-Monitor]
  end

  subgraph brain [strudel-live]
    AI[OpenAI / Claude API]
    REPL["@strudel/repl"]
    Patterns[patterns/*.strudel]
  end

  subgraph sound [Klang-Ausgabe]
    WebAudio[SuperDough Browser]
    MIDI[MIDI → IAC Driver]
    OSC[OSC → SuperCollider]
    Samples[localhost:5432 Samples]
  end

  subgraph external [Extern optional]
    Ableton[Ableton / Logic]
    SC[SuperDirt]
    HW[Synth-Hardware]
  end

  Text --> AI --> REPL
  Voice --> Text
  Patterns --> REPL
  REPL --> WebAudio
  REPL --> MIDI --> Ableton
  REPL --> MIDI --> HW
  REPL --> OSC --> SC
  Samples --> REPL
  Mic -.->|Phase 6: Autotune| WebAudio
```

## NPM-Skripte

| Befehl | Port | Zweck |
|--------|------|-------|
| `npm run dev` | 5173 | REPL + KI-Panel |
| `npm run samples` | 5432 | Eigene WAV/MP3 aus `samples/` |
| `npm run dev:full` | beide | Jam mit lokalen Samples |

## Repos & Links

- Dieses Repo: KI + Patterns + Docs
- [uzu/strudel](https://codeberg.org/uzu/strudel) — vollständiger upstream REPL
- [Strudel I/O](https://strudel.cc/learn/input-output/) — MIDI, OSC, MQTT
