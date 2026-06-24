# strudel-live — Status (Juni 2026)

Living doc for what works, what’s slow, and how to switch providers.

## What you saw: “Minimal techno erkannt — erweitere Pattern…”

That message means **step 1 succeeded** (intent DB recognized your phrase) and **step 2 was running** (LLM + agent on the server). It is not a final result.

Typical timeline with **local Ollama + dual-LLM**:

| Phase | What happens | Time (rough) |
|-------|----------------|--------------|
| Intent preview | Instant — `/api/intent` | &lt; 1s |
| KI hinzufügen / generate | 1–2 Ollama calls (orchestrator ± syntax) | **15–90s** |
| First call after restart | Model load into RAM | **up to 2–3 min** |
| UI timeout | Browser aborts fetch | **120s** (refine) |

If nothing changes for **&gt; 2 minutes**, it likely **hung** (Ollama stuck — restart Ollama app or `brew services restart ollama`).

## Architecture (current)

```
Natural language
  → Intent DB + catalog (sync, no LLM)
  → LLM 1 strudel-live (tools / refine)
  → LLM 2 strudel-coder (new patterns / weak refine)  [OLLAMA_DUAL_LLM=true]
  → validate + editor
```

Same semantic stack works with **Cloud API** — only the LLM backend changes.

## What works well (local)

- Intent recognition (DE/EN): bass ≠ drums, remove vs add
- Tool path: `mehr bass`, `weniger hats`, `remove snare`
- Presets / Ignite (Shift+chip = no AI)
- Richer patterns vs early versions (catalog layers)

## Known limitations (0.5B local)

- **Latency**: dual-LLM refine can feel “stuck” after intent preview
- **Strudel Coder fine-tune**: HF model is Safetensors — we use `strudel-coder` **alias** (Qwen + syntax prompt), not the full fine-tune yet
- **Ollama stability**: occasional hangs; restart service if `ollama list` blocks
- **Complex prompts**: weak or unchanged output → preset fallback or cloud

## Switch to Cloud API (prepared)

In `.env`:

```bash
AI_PROVIDER=openai
# USE_OLLAMA=false          # optional, avoids ollama preference
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Restart `npm run dev:full`. No code changes — `generate.mjs` uses the same intent DB, tools, and catalog; only the LLM call switches to OpenAI/Anthropic.

Priority: `AI_PROVIDER` &gt; keys &gt; `USE_OLLAMA`.

## Env reference (local dual-LLM)

```bash
AI_PROVIDER=ollama
USE_OLLAMA=true
OLLAMA_MODEL=strudel-live
OLLAMA_SYNTAX_MODEL=strudel-coder
OLLAMA_DUAL_LLM=true
```

Disable second model: `OLLAMA_DUAL_LLM=false` (faster refine, weaker new patterns).

## Next steps

- [ ] Shorter refine path: skip syntax LLM when tools succeed (partially done)
- [ ] Progress UI during long Ollama calls
- [ ] Optional GGUF import for real Strudel Coder fine-tune
- [ ] A/B local vs `AI_PROVIDER=openai` on same prompts

See also: [LOCAL-AI.md](./LOCAL-AI.md), [ROADMAP.md](./ROADMAP.md).
