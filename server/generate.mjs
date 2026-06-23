import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './system-prompt.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { ollamaChat, ORCHESTRATOR_SYSTEM, buildOllamaMessages, isDualLlmEnabled, getSyntaxModel } from './ollama.mjs';
import { isWeakStrudel, resolvePresetForPrompt } from './pattern-presets.mjs';
import { repairStrudelCode } from './llm-repair.mjs';
import { mergeLayersIntoPattern, codesTooSimilar } from './refine-merge.mjs';
import { removeLayersFromPattern } from './layer-removal.mjs';
import { formatIntentHint, intentSummary } from './intent-db.mjs';
import { searchCatalogLexical as retrieveCatalogContext } from './semantic-retrieval.mjs';
import { planAgentActions, extractToolsFromLlm, runToolCalls, TOOL_SCHEMA, looksLikeStrudelMusic } from './strudel-agent.mjs';
import {
  generateWithSyntaxAgent,
  shouldUseSyntaxAgent,
} from './strudel-syntax-agent.mjs';

const SAFE_FALLBACK_PATTERN = 'setcpm(30)\nstack(s("bd*4"), s("~ sd"))';

function stripCodeFences(text) {
  return text
    .replace(/^```(?:json|javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function resolveLlmOutput(raw, { previousCode, prompt, agentPlan } = {}) {
  const tools = extractToolsFromLlm(raw);
  if (tools?.length) {
    const tr = runToolCalls(tools, { previousCode: previousCode || '', prompt });
    return { code: tr.code, toolsUsed: tools };
  }

  let code = stripCodeFences(raw);
  if (!looksLikeStrudelMusic(code)) {
    if ((agentPlan?.layersAdded > 0 || agentPlan?.layersRemoved > 0) && agentPlan.code?.trim()) {
      return { code: agentPlan.code, source: 'agent-fallback' };
    }
    return { code: '', invalid: true };
  }
  return { code };
}

function getProvider(env) {
  const preferred = env.AI_PROVIDER?.toLowerCase();
  if (preferred === 'ollama') return 'ollama';
  if (preferred === 'openai' && env.OPENAI_API_KEY) return 'openai';
  if (preferred === 'anthropic' && env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OLLAMA_BASE_URL || env.USE_OLLAMA === 'true') return 'ollama';
  return null;
}

function buildUserMessage(prompt, previousCode, trackContext, agentPlan) {
  let msg = '';
  const intentHint = formatIntentHint(prompt);
  if (intentHint) msg += intentHint;

  const rag = agentPlan?.rag?.text || retrieveCatalogContext(prompt).text;
  if (rag) msg += `Strudel catalog (RAG):\n${rag}`;

  if (agentPlan?.tools?.length) {
    msg += `Suggested tool calls: ${JSON.stringify(agentPlan.tools)}\n\n`;
  }

  msg += `${TOOL_SCHEMA}\n\n`;

  if (trackContext?.bpm || trackContext?.id) {
    msg += `DJ context — loaded track "${trackContext.name || trackContext.id}"`;
    if (trackContext.bpm) msg += ` at ${trackContext.bpm} BPM`;
    if (trackContext.key) msg += `, key: ${trackContext.key}`;
    if (trackContext.stems?.length) msg += `, stems available via samples("http://localhost:5433")`;
    msg += '.\n\n';
  }
  if (!previousCode?.trim()) return msg + prompt;
  return `${msg}Current Strudel pattern (modify it, keep what works):\n\n${previousCode.trim()}\n\nModification request: ${prompt}`;
}

async function generateWithOpenAI(prompt, env, previousCode, trackContext, agentPlan) {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(prompt, previousCode, trackContext, agentPlan) },
    ],
  });
  const raw = response.choices[0].message.content;
  const resolved = resolveLlmOutput(raw, { previousCode, prompt, agentPlan });
  if (resolved.toolsUsed) {
    return { code: resolved.code, model, provider: 'openai', raw, toolsUsed: resolved.toolsUsed };
  }
  if (resolved.invalid) {
    return { code: resolved.code || SAFE_FALLBACK_PATTERN, model, provider: 'openai', raw, usedAgentFallback: resolved.source === 'agent-fallback' };
  }
  return { code: resolved.code, model, provider: 'openai', raw };
}

async function generateWithAnthropic(prompt, env, previousCode, trackContext, agentPlan) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(prompt, previousCode, trackContext, agentPlan) }],
  });
  const raw = response.content.find((b) => b.type === 'text')?.text ?? '';
  const resolved = resolveLlmOutput(raw, { previousCode, prompt, agentPlan });
  if (resolved.toolsUsed) {
    return { code: resolved.code, model, provider: 'anthropic', raw, toolsUsed: resolved.toolsUsed };
  }
  if (resolved.invalid) {
    return { code: resolved.code || SAFE_FALLBACK_PATTERN, model, provider: 'anthropic', raw, usedAgentFallback: resolved.source === 'agent-fallback' };
  }
  return { code: resolved.code, model, provider: 'anthropic', raw };
}

async function generateWithOllama(prompt, env, previousCode, trackContext, agentPlan) {
  const user = buildUserMessage(prompt, previousCode, trackContext, agentPlan);
  const { text, model } = await ollamaChat(
    buildOllamaMessages(ORCHESTRATOR_SYSTEM, user),
    env,
    { maxTokens: 1024 },
  );
  const resolved = resolveLlmOutput(text, { previousCode, prompt, agentPlan });
  if (resolved.toolsUsed) {
    return { code: resolved.code, model, provider: 'ollama', raw: text, toolsUsed: resolved.toolsUsed };
  }
  if (resolved.invalid) {
    return { code: resolved.code || SAFE_FALLBACK_PATTERN, model, provider: 'ollama', raw: text, usedAgentFallback: resolved.source === 'agent-fallback' };
  }
  return { code: resolved.code, model, provider: 'ollama', raw: text };
}

async function generateOllamaPipeline(prompt, env, previousCode, trackContext, agentPlan, isRefine) {
  const dual = isDualLlmEnabled(env) && getSyntaxModel(env);

  const trySyntax = async (pipeline) => {
    try {
      const syntax = await generateWithSyntaxAgent(prompt, env, {
        agentPlan,
        previousCode,
        trackContext,
      });
      const resolved = resolveLlmOutput(syntax.raw, { previousCode, prompt, agentPlan });
      if (resolved.code && looksLikeStrudelMusic(resolved.code)) {
        return {
          ...syntax,
          code: resolved.code,
          provider: 'ollama-dual',
          pipeline,
          syntaxModel: syntax.model,
        };
      }
    } catch {
      /* syntax model missing or timeout — fall through */
    }
    return null;
  };

  // New patterns: semantic stack → Strudel Coder (skip orchestrator)
  if (dual && !isRefine) {
    const syntaxResult = await trySyntax('syntax-only');
    if (syntaxResult) return { ...syntaxResult, orchestratorModel: null };
  }

  let result = await generateWithOllama(prompt, env, previousCode, trackContext, agentPlan);

  if (dual && shouldUseSyntaxAgent(env, { isRefine, agentPlan, orchestratorResult: result })) {
    const syntaxResult = await trySyntax(isRefine ? 'orchestrator+syntax' : 'syntax-fallback');
    if (syntaxResult) {
      result = {
        ...result,
        code: syntaxResult.code,
        raw: syntaxResult.raw,
        provider: 'ollama-dual',
        pipeline: syntaxResult.pipeline,
        orchestratorModel: result.model,
        syntaxModel: syntaxResult.syntaxModel,
        syntaxAgent: true,
      };
    }
  }

  return result;
}

export async function generateStrudel(prompt, env, { previousCode, trackContext } = {}) {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Prompt is empty'), { status: 400 });
  }

  const provider = getProvider(env);
  if (!provider) {
    throw Object.assign(
      new Error(
        'No AI provider. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or AI_PROVIDER=ollama (see docs/LOCAL-AI.md).',
      ),
      { status: 503 },
    );
  }

  const isRefine = Boolean(previousCode?.trim());
  const agentPlan = planAgentActions(trimmed, { previousCode });

  const result =
    provider === 'ollama'
      ? await generateOllamaPipeline(trimmed, env, previousCode, trackContext, agentPlan, isRefine)
      : provider === 'openai'
        ? await generateWithOpenAI(trimmed, env, previousCode, trackContext, agentPlan)
        : await generateWithAnthropic(trimmed, env, previousCode, trackContext, agentPlan);

  const constraint = applyMusicConstraints(result.code, {});
  let code = constraint.code;

  if (isRefine) {
    const llmOk =
      looksLikeStrudelMusic(code) && !isWeakStrudel(code) && !codesTooSimilar(code, previousCode);
    const agentOk =
      (agentPlan.layersAdded > 0 || agentPlan.layersRemoved > 0) && agentPlan.code?.trim();

    if (!llmOk && agentOk) {
      code = applyMusicConstraints(agentPlan.code, {}).code;
      constraint.fixes = [...(constraint.fixes || []), 'agent:tools'];
    } else if (llmOk) {
      const base = code;
      const merged = mergeLayersIntoPattern(base, trimmed);
      if (merged && merged.trim() !== base.trim()) {
        code = merged;
        constraint.fixes = [...(constraint.fixes || []), 'refine:layer-merge'];
      }
    } else if (agentOk) {
      code = applyMusicConstraints(agentPlan.code, {}).code;
      constraint.fixes = [...(constraint.fixes || []), 'agent:tools'];
    } else {
      code = previousCode;
      constraint.fixes = [...(constraint.fixes || []), 'refine:unchanged'];
    }
  } else if (isWeakStrudel(code) || !looksLikeStrudelMusic(code)) {
    if ((agentPlan.layersAdded > 0 || agentPlan.layersRemoved > 0) && agentPlan.code?.trim()) {
      code = applyMusicConstraints(agentPlan.code, {}).code;
      constraint.fixes = [...(constraint.fixes || []), 'agent:tools'];
    } else {
      const preset = resolvePresetForPrompt(trimmed);
      if (preset) {
        const presetConstraint = applyMusicConstraints(preset.code, {});
        code = presetConstraint.code;
        constraint.fixes = [...(constraint.fixes || []), `preset:${preset.id}`];
      }
    }
  }
  let guarded = guardStrudelCode(code, {
    fallback: isRefine ? previousCode.trim() : SAFE_FALLBACK_PATTERN,
  });

  if (guarded.usedFallback && isRefine) {
    const merged = mergeLayersIntoPattern(previousCode, trimmed);
    const removeTargets = (agentPlan.tools || [])
      .filter((t) => t.name === 'remove_layer')
      .map((t) => t.args);
    const stripped =
      removeTargets.length > 0 ? removeLayersFromPattern(previousCode, removeTargets) : null;
    const candidate = stripped?.code || merged;
    if (candidate) {
      const retry = guardStrudelCode(candidate, { fallback: previousCode.trim() });
      if (!retry.usedFallback) guarded = retry;
    }
  } else if (guarded.usedFallback && provider === 'ollama') {
    try {
      const repaired = await repairStrudelCode(result.code, env, { error: guarded.rejectedError });
      const retry = guardStrudelCode(repaired.code, { fallback: SAFE_FALLBACK_PATTERN });
      if (!retry.usedFallback) guarded = retry;
    } catch {
      /* keep fallback */
    }
  }

  const scale = parseScaleFromCode(guarded.code);
  return {
    ...result,
    code: guarded.code,
    scale,
    constraints: constraint,
    syntax: guarded.validation,
    usedFallback: guarded.usedFallback,
    rejectedError: guarded.rejectedError,
    intents: intentSummary(trimmed),
    agent: {
      tools: agentPlan.tools,
      intents: agentPlan.intents,
      layersAdded: agentPlan.layersAdded,
      layersRemoved: agentPlan.layersRemoved,
      source: agentPlan.source,
      rag: agentPlan.rag?.concepts,
      pipeline: result.pipeline,
      orchestratorModel: result.orchestratorModel,
      syntaxModel: result.syntaxModel,
    },
    toolsUsed: result.toolsUsed,
  };
}
