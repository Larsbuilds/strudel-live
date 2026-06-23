import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { TRANSITION_PROMPT, buildTransitionUserMessage } from './transition-prompt.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';

function stripCodeFences(text) {
  return text
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function getProvider(env) {
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

export async function generateTransition({ fromTrack, toPrompt, bars }, env) {
  const provider = getProvider(env);
  if (!provider) {
    throw Object.assign(new Error('No AI API key configured'), { status: 503 });
  }
  if (!toPrompt?.trim()) {
    throw Object.assign(new Error('Target prompt is empty'), { status: 400 });
  }

  const userMessage = buildTransitionUserMessage({ fromTrack, toPrompt, bars });

  let code, model;
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await client.chat.completions.create({
      model,
      temperature: 0.75,
      messages: [
        { role: 'system', content: TRANSITION_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
    code = stripCodeFences(response.choices[0].message.content);
  } else {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    const response = await client.messages.create({
      model,
      max_tokens: 1500,
      system: TRANSITION_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    code = stripCodeFences(response.content.find((b) => b.type === 'text')?.text ?? '');
  }

  return { code, model, provider, scale: parseScaleFromCode(code) };
}
