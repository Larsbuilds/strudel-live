# Strudel Live

Collaborative live-coding jams with [Strudel](https://strudel.cc) — the JavaScript port of TidalCycles, like Switch Angel uses for trance and DNB sessions.

This repo is a small local workspace: edit patterns in `patterns/`, run a browser REPL, and jam together. AGPL-3.0 applies to Strudel itself; see [Strudel license notes](https://strudel.cc/technical-manual/project-start/#respect-the-license).

## Repository

**https://github.com/Larsbuilds/strudel-live**

Clone for friends:

```bash
git clone https://github.com/Larsbuilds/strudel-live.git
cd strudel-live && npm install && npm run dev
```

## Quick start

```bash
cd strudel-live
npm install
npm run dev
```

Open http://localhost:5173 — pick a starter pattern from the dropdown, then **Ctrl+Enter** to evaluate.

List pattern files:

```bash
npm run patterns
```

## Project layout

| Path | Purpose |
|------|---------|
| `patterns/` | `.strudel` pattern files — add your own jams here |
| `src/` | Vite app embedding `@strudel/repl` |
| `docs/ROADMAP.md` | Ideas: AI co-pilot, voice control, full REPL clone |

## Important: Gemini vs. real Strudel

The Gemini answer mixes up **three different projects**:

| Name | What it actually is |
|------|---------------------|
| **`strudel-cli` on npm** | Unrelated 2018 JS framework scaffolder — **not** music Strudel |
| **`strudel-science/strudel-kit`** | Scientific UI toolkit (React/MUI) — **not** music Strudel |
| **`@strudel/*` on npm** | **Music Strudel** (TidalCycles in JS) — this is what we use |

For the full upstream REPL (shuffle examples, all samples):

```bash
git clone https://codeberg.org/uzu/strudel.git
cd strudel && pnpm i && pnpm dev
# → http://localhost:4321
```

## Jam with friends

1. Clone this repo
2. `npm install && npm run dev`
3. Add patterns under `patterns/` — they appear automatically in the dropdown
4. Share screen or stream audio while live-coding

## Learn Strudel

- [Getting started](https://strudel.cc/learn/getting-started/)
- [Workshop](https://strudel.cc/workshop/getting-started/)
- [Online REPL](https://strudel.cc/)
- Tidal Discord `#strudel` channel

## License

Pattern files in `patterns/` are yours to share. Strudel packages are AGPL-3.0-or-later.
