# Mini-Notation Spickzettel

Die Sprache hinter Strudel — in einer Zeile enorme Rhythmen bauen.

## Grundlagen

| Syntax | Bedeutung | Beispiel |
|--------|-----------|----------|
| Leerzeichen | Nacheinander (gleiche Dauer) | `s("bd sd")` |
| `~` | Pause | `s("bd ~ sd ~")` |
| `*` | Wiederholung | `s("bd*4")` = 4× Kick |
| `,` | Parallel (Polyrhythmus) | `s("bd, sd")` |
| `[ ]` | Subdivision / Gruppierung | `s("[bd sd] hh")` |
| `< >` | Alternieren | `s("<bd sd> hh")` |
| `(n,m,k)` | Euclidean | `s("bd(3,8,2)")` synkopiert |
| `!n` | n Zyklen lang halten | `s("bd!3 sd")` |

## Noten & Skalen

```javascript
n("0 2 4 7").scale("A2 minor").note()
n("<0 2 4>*2").scale("C4 pentatonic").s("sawtooth")
chord("<C^7 A7 Dm7 G7>").voicing()
```

## Layer & Struktur

```javascript
stack(
  s("bd*4"),           // Schicht 1: Drums
  n("0 4 7").scale("A minor").note().s("sawtooth"),  // Schicht 2
  s("hh*8").gain(0.3)  // Schicht 3
)
```

## Tempo & Effekte

```javascript
setcpm(140)                    // cycles per minute
.gain(0.8)
.cutoff(sine.range(400, 4000).slow(8))
.room(0.5).delay(0.25)
.speed(perlin.range(0.9, 1.1))
.sometimes(x => x.fast(2))     // zufällige Variation
```

## Übung (15 Min.)

1. `s("bd*4, ~ sd")` — Kick + Snare
2. `s("hh*16").gain(0.25)` — Hi-Hats drauf
3. `n("0 2 4").scale("A minor").note().s("sawtooth").lpf(800)` — Bass
4. Alles in `stack(...)` packen
5. KI-Prompt: *„mach daraus trance mit filter sweep"*

Workshop: [strudel.cc/workshop](https://strudel.cc/workshop/getting-started/)
