# Lokale KI ohne OpenAI (Ollama)

strudel-live kann **ohne Cloud-API** Strudel-Code generieren — über [Ollama](https://ollama.com) auf deinem Mac.

## Modelle

| Modell | Was | Empfehlung |
|--------|-----|------------|
| **strudel-live** (Default) | Qwen2.5-Coder 0.5B + Strudel-Modelfile (temp 0.3) | Schnell, Preset-Fallback |
| **[amhinson/strudel-coder-0.5B](https://huggingface.co/amhinson/strudel-coder-0.5B)** | Auf 2000 Strudel-Beispielen fine-tuned | **Beste lokale Qualität** |
| GPT-4o-mini (Cloud) | OpenAI API | Ignite JSON, komplexere Patterns |

## Schnellstart

```bash
# Standard (strudel-live alias)
npm run ollama:setup

# Besser: fine-tuned Strudel-Coder
npm run ollama:setup -- --strudel-coder
```

`.env`:
```bash
AI_PROVIDER=ollama
USE_OLLAMA=true
OLLAMA_MODEL=strudel-live
# oder: OLLAMA_MODEL=hf.co/amhinson/strudel-coder-0.5B:Q4_K_M
```

```bash
npm run dev:full
npm run verify    # E2E-Check
```

## Ollama Ignite-Pfad (v0.6.3+)

Bei `AI_PROVIDER=ollama` **kein fragiles JSON** mehr:

1. Genre → **Preset** (`patterns/10-deep-techno`, `11-schranz`, …)
2. Optional LLM-Verfeinerung + **Syntax-Repair**
3. Module nur bei Keywords (visuals → Hydra, sing → Mic, rave → RAVE)

**Shift+Klick** auf Prompt-Chips = Preset **ohne KI** (schnellster Club-Sound).

## Preset-Bibliothek

| Pattern | Genre |
|---------|-------|
| `10-deep-techno` | Hypnotic / Peak Techno |
| `11-schranz` | Industrial Schranz |
| `12-liquid-dnb` | Liquid DNB |
| `13-acid-techno` | Acid 303 |
| `14-ambient-drone` | Ambient / Downtempo |
| `15-stem-reactive` | Stem-FFT moduliert (dj:stems) |

## Qualität vs. Cloud

| | Ollama + Presets | GPT-4o-mini |
|--|------------------|-------------|
| Latenz | 2–10s lokal | Cloud |
| Komplexität | Preset-gestützt (6+ Layer) | LLM-native |
| Ignite | Deterministisch (kein JSON) | JSON-Manifest |
| Hydra/Transition | ✅ über llm-call | ✅ |
| Kosten | 0 | API |

## Troubleshooting

```bash
ollama list
curl http://localhost:11434/api/tags
npm run verify
npm run ollama:setup -- --strudel-coder
```

Nach Modelfile-Änderung: `npm run ollama:setup` erneut (recreate `strudel-live`).
