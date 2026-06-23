import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { stripCodeFences, stripFences } from './llm-utils.mjs';

export function getLlmProvider(env) {
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

export async function callLLM(system, user, env, { json = false, maxTokens = 1024 } = {}) {
  const provider = getLlmProvider(env);
  if (!provider) throw Object.assign(new Error('No AI API key configured'), { status: 503 });

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await client.chat.completions.create({
      model,
      temperature: 0.7,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const text = res.choices[0].message.content ?? '';
    return { text, model, provider };
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: json ? `${system}\n\nOutput raw JSON only.` : system,
    messages: [{ role: 'user', content: user }],
  });
  const text = res.content.find((b) => b.type === 'text')?.text ?? '';
  return { text, model, provider };
}

export function parseJsonObject(text) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON from agent');
  }
}

export function codeFromAgent(text) {
  return stripCodeFences(text);
}
