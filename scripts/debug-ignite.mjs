import { loadEnv } from 'vite';
import { callLLM } from '../server/llm-call.mjs';
import { IGNITE_PROMPT, buildIgniteUserMessage } from '../server/ignite-prompt.mjs';
import { validateStrudelSyntax } from '../server/code-validate.mjs';
import { stripCodeFences } from '../server/llm-utils.mjs';

const env = loadEnv('development', process.cwd(), '');
const prompt = process.argv[2] || 'hypnotic deep techno 128 bpm';

const { text } = await callLLM(
  IGNITE_PROMPT,
  buildIgniteUserMessage({ prompt }),
  env,
  { json: true, maxTokens: 2500 },
);

console.log('--- RAW (first 600 chars) ---');
console.log(text.slice(0, 600));

const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
const strudel = stripCodeFences(parsed.initial_states?.strudel || '');
console.log('\n--- STRUDEL CODE ---');
console.log(strudel);
console.log('\n--- VALIDATION ---');
console.log(validateStrudelSyntax(strudel));
