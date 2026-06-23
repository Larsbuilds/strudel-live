import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './system-prompt.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { ollamaChat, STRUDEL_CODER_SYSTEM, buildOllamaMessages } from './ollama.mjs';

function stripCodeFences(text) {
  return text
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
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

function buildUserMessage(prompt, previousCode, trackContext) {
  let msg = '';
  if (trackContext?.bpm || trackContext?.id) {
    msg += `DJ context — loaded track "${trackContext.name || trackContext.id}"`;
    if (trackContext.bpm) msg += ` at ${trackContext.bpm} BPM`;
    if (trackContext.key) msg += `, key: ${trackContext.key}`;
    if (trackContext.stems?.length) msg += `, stems available via samples("http://localhost:5432")`;
    msg += '.\n\n';
  }
  if (!previousCode?.trim()) return msg + prompt;
  return `${msg}Current Strudel pattern (modify it, keep what works):\n\n${previousCode.trim()}\n\nModification request: ${prompt}`;
}

async function generateWithOpenAI(prompt, env, previousCode, trackContext) {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(prompt, previousCode, trackContext) },
    ],
  });
  const code = stripCodeFences(response.choices[0].message.content);
  return { code, model, provider: 'openai' };
}

async function generateWithAnthropic(prompt, env, previousCode, trackContext) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(prompt, previousCode, trackContext) }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const code = stripCodeFences(text);
  return { code, model, provider: 'anthropic' };
}

async function generateWithOllama(prompt, env, previousCode, trackContext) {
  const user = buildUserMessage(prompt, previousCode, trackContext);
  const { text, model } = await ollamaChat(
    buildOllamaMessages(STRUDEL_CODER_SYSTEM, user),
    env,
    { maxTokens: 1024 },
  );
  const code = stripCodeFences(text);
  return { code, model, provider: 'ollama' };
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

  const result =
    provider === 'ollama'
      ? await generateWithOllama(trimmed, env, previousCode, trackContext)
      : provider === 'openai'
        ? await generateWithOpenAI(trimmed, env, previousCode, trackContext)
        : await generateWithAnthropic(trimmed, env, previousCode, trackContext);

  const constraint = applyMusicConstraints(result.code, {});
  const guarded = guardStrudelCode(constraint.code, { fallback: previousCode });

  const scale = parseScaleFromCode(guarded.code);
  return {
    ...result,
    code: guarded.code,
    scale,
    constraints: constraint,
    syntax: guarded.validation,
    usedFallback: guarded.usedFallback,
    rejectedError: guarded.rejectedError,
  };
}
