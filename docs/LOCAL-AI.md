# Lokale KI ohne OpenAI (Ollama)

strudel-live kann **ohne Cloud-API** Strudel-Code generieren — über [Ollama](https://ollama.com) auf deinem Mac.

## Modelle

| Modell | Was | Empfehlung |
|--------|-----|------------|
| **strudel-live** (Default) | Qwen2.5-Coder 0.5B + Strudel-Modelfile (temp 0.3) | **Orchestrator** — JSON tools, refine |
| **[Strudel Coder 0.5B](https://huggingface.co/amhinson/strudel-coder-0.5B)** | Fine-tune auf ~2000 Strudel-Beispielen | **Syntax agent** — dynamischer Strudel-Code |
| GPT-4o-mini (Cloud) | OpenAI API | Ignite JSON, komplexere Patterns |

## Dual-LLM (empfohlen lokal)

Zwei spezialisierte Modelle statt einem Kompromiss:

```
Natural language
  → Semantic stack (intents + catalog RAG)     ← kein LLM, sync
  → LLM 1: strudel-live (Orchestrator)         ← Tools, refine, BPM
  → LLM 2: Strudel Coder (Syntax agent)        ← Strudel JS, neue Patterns
  → validate() + evaluate()
```

| Aufgabe | Modell | Warum |
|---------|--------|-------|
| „mehr bass“, „weniger hats“ | Orchestrator + Tools | JSON/tools — kein Syntax-Raten |
| Neues Pattern („liquid dnb 174“) | **Strudel Coder** | Fine-tune auf Strudel — variabler Code |
| Kreative Verfeinerung | Orchestrator → Strudel Coder | Planner scheitert → Syntax-Nachzug |

```bash
npm run ollama:setup -- --strudel-coder
```

`.env`:
```bash
AI_PROVIDER=ollama
OLLAMA_MODEL=strudel-live
OLLAMA_SYNTAX_MODEL=strudel-coder
OLLAMA_DUAL_LLM=true   # default an bei strudel-live alias
```

`strudel-coder` ist ein Ollama-Alias (Qwen-Base + Strudel-Syntax-Prompt). Das HF-Fine-tune [amhinson/strudel-coder-0.5B](https://huggingface.co/amhinson/strudel-coder-0.5B) kann per GGUF-Import nachgerüstet werden — siehe unten.

`OLLAMA_DUAL_LLM=false` — nur ein Modell (wie bisher).

### Fine-tune importieren (optional)

Das HF-Repo ist Safetensors, kein direktes `ollama pull`. Wenn du eine GGUF-Datei hast:

```dockerfile
# Modelfile
FROM ./strudel-coder-0.5B.Q4_K_M.gguf
PARAMETER temperature 0.55
```

```bash
ollama create strudel-coder -f Modelfile
```

## Architektur: Semantic → Catalog → Tools

Kleine lokale LLMs orchestrieren **Tools**, statt Strudel-Syntax zu raten.

### Drei Schichten

| Schicht | Was | Datei |
|---------|-----|-------|
| **Semantic** | Natürliche Sprache → Konzept | `server/data/intent-examples.json` + `semantic-retrieval.mjs` |
| **Catalog** | Konzept → Strudel-Funktionen + Layer-Code | `server/strudel-catalog.mjs` |
| **Agent** | Tool-Ausführung (`append_layer`, `remove_layer`, …) | `server/strudel-agent.mjs` |

### Intent-Erkennung (professionell, nicht Regex)

Statt 12 handgeschriebener Regex-Regeln:

1. **Example-based retrieval** — ~150 Phrasen (DE/EN) in `intent-examples.json`
2. **BM25 lexical search** — immer aktiv, schnell, offline
3. **Embeddings (optional)** — Ollama `nomic-embed-text`, Cosine-Similarity
4. **Hybrid merge (RRF)** — Reciprocal Rank Fusion wie in Elasticsearch/Pinecone-RAG
5. **Confidence gating** — unter Schwellwert → kein Match (kein falscher Kick statt Bass)

**Vector DB?** Embeddings sind Vektoren. Für unsere Größe (~200 Phrasen) reicht eine **JSON-Cache-Datei** (`embedding-cache.json`) — kein Chroma/LanceDB nötig. Ab ~10k Einträgen: `sqlite-vec` oder LanceDB, gleiche API.

```bash
ollama pull nomic-embed-text   # einmalig
npm run semantic:seed          # intents aus Presets + Prompt-Book + Patterns
npm run semantic:index         # Embedding-Cache aufwärmen
curl 'http://localhost:5173/api/intent?prompt=schranz%20150&semantic=true'
curl http://localhost:5173/api/semantic/status
curl http://localhost:5173/api/catalog
```

### Daten-Dateien

| Datei | Inhalt |
|-------|--------|
| `server/data/intent-examples.json` | ~50+ Intents, ~400 Phrasen (auto + manuell) |
| `server/data/intent-examples.base.json` | Hand-curated Basis (von `semantic:seed` gemerged) |
| `server/data/strudel-docs.json` | 50+ Strudel-Funktionen von strudel.cc |
| `server/data/pattern-layers.json` | Layer aus `patterns/*.strudel` extrahiert |
| `server/data/embedding-cache.json` | Vektoren (gitignored, lokal gebaut) |

### APIs

| Endpoint | Zweck |
|----------|-------|
| `GET /api/intent?prompt=…` | Lexical (sync, schnell) |
| `GET /api/intent?prompt=…&semantic=true` | Hybrid BM25 + Embeddings |
| `GET /api/agent/plan?prompt=…` | Voller Agent-Plan |
| `GET /api/catalog` | Strudel-Funktionen + Konzepte |
| `GET /api/semantic/status` | Embedding-Modell + Cache-Status |

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
| Latenz | 15–90s (dual-LLM), erste Anfrage länger | 3–15s Cloud |
| Komplexität | Preset-gestützt (6+ Layer) | LLM-native |
| Ignite | Deterministisch (kein JSON) | JSON-Manifest |
| Hydra/Transition | ✅ über llm-call | ✅ |
| Kosten | 0 | API |

**Cloud-Umschaltung:** `AI_PROVIDER=openai` + `OPENAI_API_KEY` — gleiche Intent-/Tool-Architektur. Siehe [STATUS.md](./STATUS.md).

## Status & Troubleshooting

Vollständiges Test-Log, Latenz, Hänger nach „erweitere Pattern“: **[STATUS.md](./STATUS.md)**

```bash
ollama list
curl http://localhost:11434/api/tags
npm run verify
npm run ollama:setup -- --strudel-coder
brew services restart ollama   # wenn Ollama hängt
```

Nach Modelfile-Änderung: `npm run ollama:setup` erneut (recreate `strudel-live`).
