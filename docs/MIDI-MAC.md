# MIDI auf dem Mac — Strudel → Ableton / Synths

Strudel sendet MIDI direkt aus dem Browser (Web MIDI API). Auf dem Mac routest du intern über den **IAC Driver**.

## 1. IAC Driver aktivieren

1. **Audio-MIDI-Setup** öffnen (`/System/Applications/Utilities/Audio MIDI Setup.app`)
2. Menü **Fenster → MIDI-Studio** (oder `Cmd+2`)
3. Doppelklick auf **IAC Driver**
4. **Gerät ist online** aktivieren
5. Optional: zweiten Bus anlegen für getrennte Kanäle

## 2. Ableton einrichten

1. **Preferences → Link, Tempo & MIDI**
2. Unter **MIDI Inputs**: **IAC Driver Bus 1** → **Track** + **Remote** an
3. Neuen MIDI-Track anlegen
4. **MIDI From:** IAC Driver Bus 1
5. Instrument wählen (Serum, Vital, Drift, …)

## 3. Pattern in Strudel

Öffne `patterns/04-midi-ableton.strudel` in der App oder kopiere:

```javascript
setcpm(128)

// Akkorde an Ableton — Gerätename steht in der Browser-Konsole nach erstem Run
chord("<C^7 A7 Dm7 G7>").voicing().midi("IAC Driver")

// Oder einzelne Noten auf Kanal 1
// note("c3 e3 g3").midi("IAC Driver")
```

**Tipp:** Beim ersten Ausführen loggt Strudel verfügbare MIDI-Geräte in die Browser-Konsole (`F12` → Console). Den exakten Namen in `.midi("...")` eintragen.

## 4. Clock sync (fortgeschritten)

```javascript
stack(
  midicmd("clock*48,<start stop>/2").midi("IAC Driver")
)
```

Ableton muss **External Sync** oder entsprechende MIDI-Clock-Einstellungen unterstützen — je nach Setup experimentieren.

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Kein MIDI-Gerät in Konsole | Chrome nutzen; Seite neu laden; IAC online? |
| Ableton hört nichts | MIDI Input Track+Remote; richtiger Bus; Monitor auf In |
| Latenz | `.midi(..., { latencyMs: 50 })` anpassen |
| Nur CC, keine Noten | `{ isController: true }` entfernen |

Mehr: [strudel.cc/learn/input-output](https://strudel.cc/learn/input-output/)
