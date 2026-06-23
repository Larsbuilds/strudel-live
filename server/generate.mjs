import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './system-prompt.mjs';

function stripCodeFences(text) {
  return text
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function getProvider(env) {
  const preferred = env.AI_PROVIDER?.toLowerCase();
  if (preferred === 'openai' && env.OPENAI_API_KEY) return 'openai';
  if (preferred === 'anthropic' && env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

async function generateWithOpenAI(prompt, env) {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });
  return { code: stripCodeFences(response.choices[0].message.content), model, provider: 'openai' };
}

async function generateWithAnthropic(prompt, env) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  return { code: stripCodeFences(text), model, provider: 'anthropic' };
}

export async function generateStrudel(prompt, env) {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Prompt is empty'), { status: 400 });
  }

  const provider = getProvider(env);
  if (!provider) {
    throw Object.assign(
      new Error(
        'No AI API key configured. Copy .env.example to .env and set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
      ),
      { status: 503 },
    );
  }

  if (provider === 'openai') return generateWithOpenAI(trimmed, env);
  return generateWithAnthropic(trimmed, env);
}
