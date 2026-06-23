# SuperCollider + SuperDirt (OSC)

Für **Studio-Sound** wie in der originalen TidalCycles-Szene — Strudel schickt OSC an SuperCollider statt den Browser-Synth zu nutzen.

## Voraussetzungen

1. [SuperCollider](https://supercollider.github.io/) installieren
2. SuperDirt oder [StrudelDirt](https://codeberg.org/uzu/strudel) (optimierte Fork) installieren — siehe [Tidal Install Guide](https://tidalcycles.org/docs/getting-started/linux-installation)
3. Strudel upstream klonen für OSC-Bridge:

```bash
git clone https://codeberg.org/uzu/strudel.git
cd strudel
pnpm i
pnpm run osc    # OSC-Server starten
```

4. SuperCollider starten, SuperDirt booten (siehe Tidal-Docs)
5. Im REPL **Settings → Audio Engine Target → OSC** oder `.osc()` ans Pattern hängen

## Pattern-Beispiel

Siehe `patterns/05-superdirt-osc.strudel`:

```javascript
setcpm(120)
s("bd sd hh").osc()
```

## Wann lohnt sich das?

- Du willst den klassischen Dirt-Sound
- Schwere Synthese lastet auf SC statt im Browser
- Du performst mit dem Setup der Tidal-Community

Für den Einstieg reicht **Browser-Audio + MIDI zu Ableton** — OSC ist Phase 4.
