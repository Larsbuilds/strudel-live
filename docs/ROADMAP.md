# Roadmap & ideas

Starting points after the initial setup. Pick what sounds fun for the group.

## Phase 1 — Learn the language (now)

- [ ] Everyone runs `npm run dev` and plays the three starter patterns
- [ ] Work through the [Strudel workshop](https://strudel.cc/workshop/getting-started/) (30–60 min)
- [ ] Each person adds one pattern file in `patterns/` and opens a PR
- [ ] Watch a Switch Angel set for vibe reference (YouTube: "Switch Angel strudel" / algorave)

**Useful mini-notation reminders:**

```javascript
s("bd sd")           // samples: kick, snare
s("bd*4")            // kick four times per cycle
s("bd ~ sd ~")       // rest with ~
n("0 2 4").scale("C minor")  // notes
stack(a, b, c)       // layers
setcpm(140)          // tempo (cycles per minute)
```

## Phase 2 — Better local workflow

- [ ] Pin `@strudel/repl` version in `package.json` so jams don't break on updates
- [x] Auto-load all `patterns/*.strudel` files (no manual `patterns.js` edits)
- [ ] Optional: clone [uzu/strudel](https://codeberg.org/uzu/strudel) for the full REPL + sample library
- [ ] MIDI out to hardware / DAW (Strudel supports MIDI — see technical manual)

## Phase 3 — AI co-pilot (Cursor / ChatGPT / Claude)

Strudel is plain JavaScript text — LLMs handle it well.

**Pipeline:**

```
Your prompt → LLM → Strudel code → paste into REPL → Ctrl+Enter
```

**Example prompts:**

- "140 BPM trance: 4/4 kick, offbeat hat, saw lead in A minor with slow filter sweep"
- "Dark techno kick pattern, minimal, 128 BPM"
- "DNB break at 174 BPM with synkopated kick and rolling hats"

**In Cursor:** open a `.strudel` file, describe the vibe, iterate until it sounds right.

**Guardrails:**

- Sample names (`s("bd")`) must match Strudel's built-in dirt samples or your loaded pack
- Ask the model to use only documented functions from strudel.cc
- Keep patterns short; compose with `stack()`

## Phase 4 — Voice → music (later)

No built-in voice control yet; community builds pipelines:

```
[Mic] → Whisper (STT) → text prompt → LLM → Strudel code → REPL
```

**Stack options:**

| Piece | Option |
|-------|--------|
| Speech-to-text | OpenAI Whisper API, local `whisper.cpp`, browser Web Speech API |
| LLM | Cursor, Claude, GPT-4o, local model |
| Execution | This repo's REPL, or `@strudel/web` for programmatic `.play()` |

**MVP script idea** (`scripts/voice-jam.mjs`):

1. Record 5s audio
2. Transcribe: "mach einen schnellen Trance Beat"
3. Send to LLM with system prompt containing Strudel docs excerpt
4. Write result to `patterns/generated.strudel` and hot-reload

## Phase 5 — Perform / share

- [ ] Record sets (OBS + browser audio)
- [ ] Export patterns as share URLs from [strudel.cc](https://strudel.cc) (Share button)
- [ ] Remote jam: one person screenshares REPL, others PR pattern ideas in GitHub

## References

- [Strudel project start](https://strudel.cc/technical-manual/project-start/)
- [Codeberg source](https://codeberg.org/uzu/strudel)
- [Tidal Club forum](https://club.tidalcycles.org/)
- Community AI tools: search "strudel generator" / Cerebras demos
