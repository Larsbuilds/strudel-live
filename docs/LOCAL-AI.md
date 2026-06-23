# Lokale KI ohne OpenAI (Ollama)

strudel-live kann **ohne Cloud-API** Strudel-Code generieren — über [Ollama](https://ollama.com) auf deinem Mac.

## Das Modell, das du meintest

| Modell | Was | Größe |
|--------|-----|-------|
| **[amhinson/strudel-coder-0.5B](https://huggingface.co/amhinson/strudel-coder-0.5B)** | Auf **2000 Strudel-Beispielen** fine-tuned (Qwen2.5-Coder) | ~0.5B |
| [strudel-coder-0.5B-ONNX](https://huggingface.co/amhinson/strudel-coder-0.5B-ONNX) | Gleiches Modell für Browser/transformers.js | — |
| [hidude562/strudel-fim-5m](https://huggingface.co/hidude562/strudel-fim-5m) | Fill-in-the-middle, 5M Params | tiny |

**strudel-coder** ist das spezialisierte Strudel-Modell. Für Ollama nutzen wir zuerst **Qwen2.5-Coder 0.5B** + Strudel-System-Prompt; optional importierst du strudel-coder als GGUF.

## Schnellstart (5 Minuten)

```bash
# 1. Ollama installieren: https://ollama.com/download

# 2. Modell + strudel-live Alias anlegen
npm run ollama:setup

# 3. .env
AI_PROVIDER=ollama
USE_OLLAMA=true
OLLAMA_MODEL=strudel-live

# 4. App starten
npm run dev:full
```

→ Browser http://localhost:5173 → Prompt-Chip oder Text → **Ignite & Start**

Whisper/Spracheingabe braucht weiterhin OpenAI — ohne Key nur **Text-Prompts** und **Pattern-Picker**.

## .env

```bash
AI_PROVIDER=ollama
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=strudel-live
```

## Echtes strudel-coder GGUF (optional)

Wenn auf Hugging Face ein Ollama-fähiges GGUF von `amhinson/strudel-coder-0.5B` verfügbar ist:

```bash
ollama pull hf.co/amhinson/strudel-coder-0.5B:Q4_K_M
# in .env:
OLLAMA_MODEL=strudel-coder-0.5b
```

## Qualität vs. Cloud

| | Ollama (0.5B) | GPT-4o-mini |
|--|---------------|-------------|
| Latenz | lokal, ~2–10s | Cloud |
| Strudel-Syntax | gut mit Acorn-Guard | besser |
| Ignite JSON | kann scheitern | stabiler |
| Kosten | 0 | API |

**Acorn Syntax-Guard** und **music-constraints** fangen viele Halluzinationen ab — auch bei kleinen Modellen.

## Troubleshooting

```bash
ollama list
curl http://localhost:11434/api/tags
npm run check
```

Modell fehlt → `npm run ollama:setup` erneut.
