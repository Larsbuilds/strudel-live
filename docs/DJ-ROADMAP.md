# DJ-Modus — Phasen 7–10

Live-AI-DJ-Erweiterung für strudel-live.

## Was umgesetzt ist

| Phase | Feature | Befehl / UI |
|-------|---------|-------------|
| **7** | SoundCloud / URL → lokale Samples | `npm run sc:fetch -- --url "..."` |
| **7** | Track-Manifest (BPM, Key, Stems) | `samples/manifest.json` · DJ-Panel |
| **8** | Audio-Analyse (BPM, Dauer) | `npm run dj:analyze -- --track path` |
| **8** | Stem-Separation (Demucs) | `npm run dj:stems -- --track path` |
| **9** | KI-Übergangs-Pattern | DJ-Panel → „Übergang generieren“ |
| **10** | DJ-Controller (Web MIDI) | DDJ/Kontrol Crossfader + Filter-CCs |

## Was noch offen / extern

| Feature | Status |
|---------|--------|
| SoundCloud offizielle API | Nicht nötig — `yt-dlp` lokal |
| Essentia.js Cue-Points | Grob über Analyse-Skript erweiterbar |
| Ableton Link (`node-abletonlink`) | Doku — Browser-Strudel nutzt `setcpm()` aus Metadaten |
| Studio-Stem-Qualität | Braucht GPU + `pip install demucs` |

## Workflow

```bash
# 1. Dependencies (einmalig)
npm run dj:deps          # yt-dlp, optional demucs

# 2. Track laden
npm run sc:fetch -- --url "https://soundcloud.com/artist/track"

# 3. Analysieren
npm run dj:analyze -- --track samples/soundcloud/mein-track.wav

# 4. Stems (optional, langsam)
npm run dj:stems -- --track samples/soundcloud/mein-track.wav

# 5. App mit Samples
npm run dev:full
# → DJ-Panel: Track wählen → Übergang generieren
# → Pattern 07-dj-stems oder 08-dj-controller
```

## Controller-Mapping (Phase 10)

| MIDI CC | Funktion |
|---------|----------|
| CC 8 | Crossfader (Stem ↔ Strudel) |
| CC 1 | Lowpass Track A |
| CC 2 | Lowpass Track B / Strudel |

Gerät im DJ-Panel verbinden — Werte werden im UI angezeigt und können in Patterns via `midin()` genutzt werden.

## Rechtliches

Nur Tracks nutzen, die ihr streamen/dj'en dürft. `sc:fetch` cached lokal für private Jams — keine Weiterverbreitung.
