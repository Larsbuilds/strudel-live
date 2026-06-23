# Prompt-Buch — Club-Standard-Prompts

Getestete Formulierungen für **Ignite** (ein Prompt → alles startet), **Conductor** (Übergang im laufenden Set) und **Verfeinern** (Pattern anpassen).

**Voraussetzung:** `OPENAI_API_KEY` in `.env`, `npm run dev:full`, Ignite-Checkbox aktiv.

---

## Wie Prompts wirken

| Modus | Button | Wann |
|-------|--------|------|
| **Ignite** | Ignite & Start | Neues Set von null — KI wählt Module (Hydra, Mic, …) |
| **Conductor** | Conductor ausführen (DJ-Modus) | Laufender Beat → quantisierter Drop auf Eins |
| **Verfeinern** | Erweitert → Verfeinern | Nur Strudel-Code ändern |

**Nuancen, die das System erkennt:**

- **BPM-Zahl** → `setcpm(bpm/4)` im generierten Code
- **Farben / Visuals** → Hydra-Shader (neon, stroboskop, minimal)
- **„mitsingen / live vocals“** → Mikrofon + Key-Sync
- **„neural / RAVE“** → RAVE-Bridge (wenn Server läuft)
- **„düster / aggressiv“** (Conductor) → Strudel + WAM-Filter + Hydra gleichzeitig

---

## Trance & Euphoric

### 90s Uplifting Trance
```
90s Trance, 140 BPM, euphoric uplifting, Saw-Lead und Pad in A-Moll, rollende Hi-Hats, blaue Neon-Visuals, langsame Kaleidoskop-Modulation
```
**Erwartung:** Helle Hydra-Farben, melodischer Lead, ~140 BPM, kein Mic.

### Acid Trance
```
Acid Trance 138 BPM, squelchy 303 Bassline, harte Kick, grüne pulsierende Hydra-Visuals, minimal Vocals
```
**Erwartung:** Acid-Charakter, grüne `osc`/`modulate`-Visuals.

---

## Techno & Deep

### Hypnotic Deep (mit Gesang)
```
Hypnotic Deep Techno 128 BPM, dunkelrote Visuals, harte Kicks, subtiler Bass, ich will live dazu singen mit Key-Sync
```
**Erwartung:** Mic an, Key-Sync, rote Hydra, 128 BPM.

### Berlin Minimal
```
Berlin Minimal Techno 125 BPM, trocken und reduziert, nur Drums und Clicks, schwarz-weiße minimalistische Visuals, kein Mic
```
**Erwartung:** Sparse Pattern, wenig Melodie, monochrome Visuals.

### Peak-Time
```
Peak-Time Techno 132 BPM, aggressiver Drive, industrial Hi-Hats, rote stroboskopartige Hydra-Visuals
```
**Erwartung:** Härterer Mix, schnellere visuelle Modulation.

---

## Hard & Industrial

### Industrial Schranz
```
Industrial Schranz 150 BPM, verzerrte Kicks, metallische Percussion, flackerndes rot-schwarzes Stroboskop in Hydra, düster und aggressiv
```
**Erwartung:** Hohes BPM, harte Drums, `thresh`/`invert`-artige Visuals.

### Hard Techno
```
Hard Techno 145 BPM, distorted rumble bass, keine Melodie, glitchige schwarze Visuals, maximaler Druck
```
**Erwartung:** Bass-lastig, wenig Harmonie, dunkle glitchy Shader.

---

## DNB & Bass

### Liquid DNB
```
Liquid Drum and Bass 174 BPM, warme Pads, synkopierter Break, cyan-blaue fließende Hydra-Visuals, sanft
```
**Erwartung:** ~174 BPM, Breakbeat-Feel, weiche Farben.

### Neurofunk
```
Neurofunk DNB 172 BPM, wobble bass, scharfe Drums, dunkle violette glitch Visuals
```
**Erwartung:** Wobble-Bass, dunklere Palette.

---

## Ambient & Downtempo

### Ambient Drone
```
Ambient Drone 80 BPM, langsame Evolving Pads, kein Kick, weiche lila Visuals, viel Reverb, entspannt
```
**Erwartung:** Langsam, pad-lastig, kein harter Kick.

### Downtempo
```
Downtempo 95 BPM, lo-fi Beats, warme Rhodes, goldene sanfte Visuals, chillig
```
**Erwartung:** Mid-tempo, warm, entspannte Visuals.

---

## DJ mit SoundCloud-Stems

1. `npm run sc:fetch` → `dj:analyze` → optional `dj:stems`
2. Track im DJ-Modus wählen
3. **Stem-FFT für Hydra starten**
4. Ignite mit Stem-Kontext:

```
DJ-Set: Vocals und Bass vom geladenen Track untermalen, 126 BPM, generativer Minimal-Techno-Gegenpart, Visuals reagieren auf Stem-FFT Bass und Drums
```

**Hydra mit Stems (manuell oder KI):**
```javascript
osc(12, 0.05, () => window.dj_stems.bass() * 2)
  .modulate(noise(4), () => window.dj_stems.drums() * 0.4)
  .color(1, 0, 0.2).out()
```

---

## Conductor — Übergänge (laufendes Set)

Beat muss laufen. Countdown-Ring zeigt DROP. Prompt ins **Conductor**-Feld:

| Situation | Prompt |
|-----------|--------|
| Drop verschärfen | `Übergang jetzt düster und aggressiv — härtere Drums, tiefer Bass, rot-schwarzes Stroboskop` |
| Vocals betonen | `Minimaler Gegenpart für die Vocals, nur Pad und subtile Percussion, Visuals zurückhaltend` |
| Energy hoch | `Build-up über 8 Bars, Filter öffnen, mehr Hi-Hats, Visuals heller und schneller` |
| Outro | `Ausklang: Drums ausdünnen, nur Pad und Reverb, Visuals langsam schwarz faden` |

---

## Verfeinern — Follow-ups

Checkbox **Verfeinern** aktivieren, dann:

| Prompt | Effekt |
|--------|--------|
| `mehr Reverb und Raum` | `.room()` / Hall |
| `nur Drums, kein Lead` | Melodien entfernen |
| `härter und aggressiver, mehr Distortion` | Drive, Filter zu |
| `langsamerer Filter-Sweep, weniger Hi-Hats` | Weniger Oberton, ruhiger |

---

## Nuancen-Test (Sensitivität)

Vergleiche Paare — gleiche BPM, anderer Stil:

| A | B |
|---|---|
| `90s Trance, 140 BPM, euphoric, blaue Neon-Visuals` | `Industrial Schranz 150 BPM, Stroboskop, verzerrt` |
| `Ambient 80 BPM, lila, kein Kick` | `Peak-Time Techno 132 BPM, rotes Stroboskop` |
| `…mitsingen mit Key-Sync` | `…kein Mic, nur Instrumental` |

**Checkliste nach Ignite:**
- [ ] BPM im Code (`setcpm`) plausibel?
- [ ] Hydra-Farben passen zum Prompt?
- [ ] Mic nur wenn gewünscht?
- [ ] Takt-Cue pulsiert mit Beat?
- [ ] NOT-AUS funktioniert?

---

## Demo & Release

Wenn Ignite + Conductor + Hydra-Stems im Takt laufen:

1. **30–60 s Screen-Recording** (Beat + Visuals + optional Countdown-Drop)
2. **README** + Link zu diesem Prompt-Buch
3. **GitHub Release** `v0.5.x` taggen
4. Optional: **Hacker News** — Titel z. B. *"strudel-live: AI live-DJ with Strudel, Demucs stems, Hydra visuals, and quantized conductor"*

---

Siehe auch: [WORKFLOW.md](WORKFLOW.md) · [SOUND-VISION.md](SOUND-VISION.md) · [MUSIC-LOGIC.md](MUSIC-LOGIC.md)
