# Musik-Logik: Isabelle, Z3 und was wir wirklich brauchen

Nüchterne Einordnung für **strudel-live** — ohne Hype.

## Isabelle / Theorembeweiser

**Was es ist:** Interaktiver Beweiser für mathematische Sätze (HOL). Ziel: *absolute Korrektheit* von Spezifikationen — Mikrokernel, Krypto, formale Mathematik.

**Warum es hier nicht passt:**

| Kriterium | Isabelle | Live-DJ / Strudel |
|-----------|----------|-------------------|
| Latenz | Sekunden bis Stunden | Millisekunden |
| Ziel | Wahrheit beweisen | Klingen + Groove |
| Musik | keine native Audio-Pipeline | Web Audio, Echtzeit |
| Ästhetik | binär (beweisbar / nicht) | Kontext, Intention, Genre |

Musiktheorie ist **Regelwerk + Geschmack**, kein Axiomensystem mit eindeutigen Wahrheitswerten. „Dissonanz“ ist in Jazz Feature, in Techno Fehler — das entscheidet nicht die Logik, sondern der Prompt und das Genre.

**Fazit:** Isabelle für dieses Projekt ist **Overengineering**. Sinnvoll wäre es höchstens als Forschungs-Sidecar (z. B. formale Spezifikation von Rhythmus-Gitter), nicht im Hot-Path eines Club-Sets.

## Was es schon gibt (nah an der Idee)

- **Constraint Programming / SMT (Z3):** „Finde Noten, die diese Regeln erfüllen“ — schnell (ms), gut für harte Constraints.
- **OMPR / OpenMusic, Strasheelo:** algorithmische Komposition mit Regeln — akademisch, nicht Club-UI.
- **Tidal/Strewudel selbst:** Patterns *sind* bereits mathematische Objekte (Zyklen, Teilbarkeit) — ihr nutzt das implizit via Mini-Notation.
- **KI + Post-Validation:** LLM generiert, deterministischer Checker filtert — das ist der pragmatische Mittelweg.

## Unser Ansatz (v0.5.3)

1. **`server/music-constraints.mjs`** — leichtgewichtiger, deterministischer Checker (kein Isabelle, kein Z3-Zwang):
   - BPM in sinnvollem Bereich
   - `setcpm()` vorhanden oder wird injiziert
   - `.scale()` konsistent zum Ignite-Manifest
   - Code-Länge / offensichtliche Fehler

2. **Optional später: Z3** — nur wenn ihr *harte* Constraints wollt (z. B. „alle Noten ∈ Skala“, „Polyrhythmus teilt sich durch 4“). `z3-solver` ist schwerer (native Bindings). Erst lohnend, wenn die JS-Regeln nicht reichen.

3. **`/api/ignite`** — ein Prompt → Boot-Manifest → Frontend schaltet Module automatisch. Das löst das UX-Problem; formale Logik ist ein *zusätzlicher Guardrail*, kein Ersatz für KI.

## Wann Z3 Sinn machen *könnte*

- Ihr generiert **Melodien als MIDI-Notenlisten** und wollt garantieren: keine Tonart-Verletzung.
- Ihr plant **generative Übergänge** mit expliziten mathematischen Invarianten (z. B. gemeinsames Raster über 16 Bars).
- Latenz-Budget: **&lt; 10 ms** pro Check — dann ja; Isabelle-nein.

## Wann gar nichts Formalen ninnvoll ist

- Reine Drum-Patterns, Noise, Samples — da helfen Constraints wenig.
- Experimentelle / Noise-Sets — Regeln würden kreativ stören.

---

**Kurz:** Axiomatisches Reasoning ja — aber als **schneller Constraint-Check**, nicht als Theorembeweis. Isabelle: nein. Z3: optional, später. Jetzt: `music-constraints.mjs` + Ignite.
