import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { HYDRA_PROMPT } from './hydra-prompt.mjs';

function stripFences(text) {
  return text
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

async function callLLM(system, prompt, env) {
  if (env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await client.chat.completions.create({
      model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return { text: res.choices[0].message.content, model, provider: 'openai' };
  }
  if (env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    const res = await client.messages.create({
      model,
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content.find((b) => b.type === 'text')?.text ?? '';
    return { text, model, provider: 'anthropic' };
  }
  throw Object.assign(new Error('No AI API key configured'), { status: 503 });
}

export async function generateHydra(prompt, env, { stemLevels } = {}) {
  if (!prompt?.trim()) throw Object.assign(new Error('Prompt is empty'), { status: 400 });
  const fullPrompt = stemLevels ? `${prompt.trim()}\n\n${stemLevels}` : prompt.trim();
  const { text, model, provider } = await callLLM(HYDRA_PROMPT, fullPrompt, env);
  return { code: stripFences(text), model, provider };
}
