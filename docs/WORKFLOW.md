# Kompletter Workflow — strudel-live

End-to-end Pfad von SoundCloud-Track bis Live-DJ-Set mit Visuals.

## Architektur (alles verbunden)

```
sc:fetch → dj:analyze → manifest.json
                ↓
         dev:full (App :5173 + Samples :5432)
                ↓
    ┌───────────┴───────────┐
    │   workflow-hub.js    │  ← zentrale Pattern-Anwendung
    └───────────┬───────────┘
                ↓
    Session (Key-Sync) · REPL · Hydra-Event
```

## Schnelltest

```bash
npm run check           # Setup
npm run dev:full        # App + Samples (2 Terminals → ein Befehl)
npm run workflow:check  # APIs + Integration
```

## Voller DJ-Workflow (Schritt für Schritt)

| # | Aktion | Wo |
|---|--------|-----|
| 1 | Track laden | `npm run sc:fetch -- --url "…"` |
| 2 | BPM analysieren | `npm run dj:analyze -- --track samples/soundcloud/….wav` |
| 3 | Stems (optional) | `npm run dj:stems -- --track …` |
| 4 | Server starten | `npm run dev:full` |
| 5 | Track wählen | DJ-Modus → Manifest → Aktualisieren |
| 6 | Stems hören | Pattern `07-dj-stems` (TRACK-ID anpassen) |
| 7 | Übergang | DJ-Modus → KI-Übergang → Ziel beschreiben |
| 8 | Visuals | Sound & Vision → Hydra starten → KI-Visuals |
| 9 | Controller | DJ-Controller verbinden → Pattern `08-dj-controller` |
| 10 | Gesang | Mikrofon Key-Sync (nach KI-Pattern mit `.scale()`) |

## KI-Workflow (ohne SoundCloud)

1. Text / 🎤 / 🎙 → **Generieren & Abspielen**
2. **Verfeinern** → „mehr Reverb"
3. **Speichern** → erscheint im Pattern-Dropdown (auto-refresh)
4. Optional: Hydra + WAM parallel

## Integration prüfen

```bash
npm run workflow:check
```

Prüft: Patterns, API-Keys, ffmpeg, alle `/api/*` Endpoints, Live-KI-Generierung.

## Bekannte Abhängigkeiten

| Feature | Braucht |
|---------|---------|
| Samples in Strudel | `npm run dev:full` |
| Whisper | OPENAI_API_KEY |
| WAM-Synths | Chrome, Internet (CDN) |
| SynthDef → SC | SuperCollider (`brew install --cask supercollider`) |
| Demucs Stems | `pip install demucs` |
