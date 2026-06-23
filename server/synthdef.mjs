import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SYNTHDEF_PROMPT } from './synthdef-prompt.mjs';

function stripFences(text) {
  return text
    .replace(/^```(?:supercollider|sc|sclang)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function extractSynthName(code) {
  const m = code.match(/SynthDef\s*\\(\w+)/);
  return m?.[1] || 'custom_synth';
}

async function callLLM(system, prompt, env) {
  if (env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await client.chat.completions.create({
      model,
      temperature: 0.7,
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
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content.find((b) => b.type === 'text')?.text ?? '';
    return { text, model, provider: 'anthropic' };
  }
  throw Object.assign(new Error('No AI API key configured'), { status: 503 });
}

export async function generateSynthDef(prompt, env) {
  if (!prompt?.trim()) throw Object.assign(new Error('Prompt is empty'), { status: 400 });
  const { text, model, provider } = await callLLM(SYNTHDEF_PROMPT, prompt.trim(), env);
  const code = stripFences(text);
  return { code, synthName: extractSynthName(code), model, provider };
}
