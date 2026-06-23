# Roadmap — strudel-live

## Phase 1 — Lernen

- [ ] `npm run dev` — KI oder Starter-Pattern
- [ ] [Workshop](https://strudel.cc/workshop/getting-started/)
- [ ] `docs/MINI-NOTATION.md`

## Phase 2 — Lokales Setup ✅

- [x] KI Text → Strudel → Auto-Play
- [x] Verfeinern-Modus („mehr Reverb“, „nur Drums“)
- [x] Pattern speichern → `patterns/generated/`
- [x] Browser-Spracheingabe (Chrome)
- [x] OpenAI Whisper (🎙 Button + `npm run voice`)
- [x] Auto-load `patterns/**/*.strudel` + Hot-Reload
- [x] `npm run check` Setup-Validator
- [ ] API-Key in `.env`

## Phase 3 — MIDI → DAW ✅ vorbereitet

- [x] Pattern `04-midi-ableton`
- [x] `docs/MIDI-MAC.md`
- [x] MIDI-Geräteliste im Browser (Web MIDI)
- [ ] IAC Driver + Ableton testen (manuell)

## Phase 4 — SuperDirt / OSC ✅ vorbereitet

- [x] `docs/SUPERCOLLIDER.md`
- [x] Pattern `05-superdirt-osc`
- [x] `npm run osc:check` + `npm run superdirt:help`
- [ ] SuperCollider installieren (manuell)

## Phase 5 — Sprache ✅

- [x] Web Speech API
- [x] Whisper API (`/api/transcribe`, 🎙 UI)
- [x] `npm run voice -- --prompt "..."` CLI
- [x] `npm run voice -- --audio file.webm`

## Phase 6 — Gesang & Autotune ✅ Basis

- [x] Mikrofon-Monitor
- [x] Pitch-Correction (Tone.js + pitchy)
- [x] Key-Sync aus KI-Pattern `.scale()` / `chord()`
- [ ] Studio-Qualität Autotune (feinere DSP)

## Production

- [x] `npm run build && npm start` — Express + API + Static

Siehe `docs/ARCHITECTURE.md` · `docs/GEMINI-EXTRACT.md`
