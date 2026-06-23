import { HYDRA_PROMPT } from './hydra-prompt.mjs';
import { callLLM, codeFromAgent } from './llm-call.mjs';

export async function generateHydra(prompt, env, { stemLevels } = {}) {
  if (!prompt?.trim()) throw Object.assign(new Error('Prompt is empty'), { status: 400 });
  const fullPrompt = stemLevels ? `${prompt.trim()}\n\n${stemLevels}` : prompt.trim();
  const { text, model, provider } = await callLLM(HYDRA_PROMPT, fullPrompt, env, { maxTokens: 512 });
  return { code: codeFromAgent(text), model, provider };
}
