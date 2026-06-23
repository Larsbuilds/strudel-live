# Roadmap — strudel-live

## Phase 1 — Lernen (jetzt)

- [ ] `npm run dev` — KI-Prompt oder Starter-Pattern spielen
- [ ] [Workshop](https://strudel.cc/workshop/getting-started/) (30–60 Min.)
- [ ] `docs/MINI-NOTATION.md` durchgehen
- [ ] Jeder legt ein Pattern in `patterns/` an

## Phase 2 — Lokales Setup ✅ größtenteils

- [x] KI Text → Strudel → Auto-Play (`src/ai-panel.js`)
- [x] Browser-Spracheingabe ohne API-Key (`src/voice-input.js`)
- [x] Auto-load `patterns/*.strudel`
- [x] Lokaler Sample-Server (`npm run samples`, `samples/`)
- [ ] API-Key in `.env` für KI

## Phase 3 — Pro-Sound: MIDI → DAW

- [x] Beispiel-Pattern `04-midi-ableton.strudel`
- [x] Mac IAC-Anleitung `docs/MIDI-MAC.md`
- [ ] IAC Driver aktivieren + Ableton MIDI-Track testen
- [ ] Serum/Vital mit Strudel-Akkorden steuern

## Phase 4 — SuperCollider / SuperDirt (OSC)

- [x] Doku `docs/SUPERCOLLIDER.md`
- [x] Pattern `05-superdirt-osc.strudel`
- [ ] SuperCollider + SuperDirt installieren
- [ ] `pnpm run osc` im upstream strudel-Repo

## Phase 5 — Sprache (Whisper, optional)

- [x] Browser Web Speech API (Chrome, deutsch)
- [ ] OpenAI Whisper API für bessere Erkennung
- [ ] `scripts/voice-jam.mjs` CLI

## Phase 6 — Gesang & Autotune (Vision)

- [x] Mikrofon-Monitor (`src/mic-panel.js`)
- [ ] Pitch-Correction via Web Audio / Tone.js / AudioWorklet
- [ ] **Key-Sync:** Wenn Pattern `Am` spielt, Autotune live auf Am umschalten
- [ ] Mic + Strudel-Output mischen

Siehe auch `docs/GEMINI-EXTRACT.md` und `docs/ARCHITECTURE.md`.
