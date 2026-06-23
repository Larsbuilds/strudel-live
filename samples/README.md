# Eigene Samples

Lege hier **WAV** oder **MP3** Dateien ab — Unterordner werden mit einbezogen.

## Server starten

```bash
npm run samples
# → http://localhost:5432
```

Oder zusammen mit der App:

```bash
npm run dev:full
```

## In Strudel laden

```javascript
samples("http://localhost:5432")
s("dein-dateiname")  // ohne Endung, je nach Ordnerstruktur
```

Pattern-Beispiel: `patterns/06-local-samples.strudel`

## Ordnerstruktur (Beispiel)

```
samples/
  kicks/
    hard-kick.wav
  snares/
    tight-snare.wav
```

Im Pattern dann z. B. `s("kicks/hard-kick")` — exakte Namen stehen im Server-Log mit `LOG=1`:

```bash
LOG=1 npm run samples
```

## Dirt-Samples

Die Standard-Drums (`bd`, `sd`, `hh`) kommen aus dem eingebauten Sample-Set — eigene Samples sind optional für personalisierten Sound.
