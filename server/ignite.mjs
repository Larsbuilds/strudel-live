import { IGNITE_PROMPT, buildIgniteUserMessage } from './ignite-prompt.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { stripCodeFences } from './llm-utils.mjs';
import { getLlmProvider, callLLM } from './llm-call.mjs';

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Ignite response is not valid JSON');
  }
}

export async function generateIgnite({ prompt, trackContext }, env) {
  const provider = getLlmProvider(env);
  if (!provider) throw Object.assign(new Error('No AI provider configured'), { status: 503 });
  if (!prompt?.trim()) throw Object.assign(new Error('Prompt is empty'), { status: 400 });

  const userMessage = buildIgniteUserMessage({ prompt, trackContext });
  const { text: raw, model } = await callLLM(IGNITE_PROMPT, userMessage, env, {
    json: true,
    maxTokens: 2500,
  });

  const parsed = parseJson(raw);
  const setup = parsed.setup || {};
  const initial = parsed.initial_states || parsed.initialStates || {};

  let strudel = stripCodeFences(initial.strudel || '');
  if (!strudel) throw Object.assign(new Error('Ignite returned no strudel code'), { status: 502 });

  const constraint = applyMusicConstraints(strudel, {
    bpm: setup.bpm,
    scale: setup.scale,
  });

  const guarded = guardStrudelCode(constraint.code);
  strudel = guarded.code;

  const hydra = stripCodeFences(initial.hydra || '');
  const wam = initial.wam && typeof initial.wam === 'object' ? initial.wam : {};

  return {
    summary: parsed.summary || 'Session ignited',
    setup: {
      bpm: setup.bpm || 120,
      scale: setup.scale || null,
      modules: {
        hydra: Boolean(setup.modules?.hydra),
        stems: Boolean(setup.modules?.stems),
        rave: Boolean(setup.modules?.rave),
        faust: Boolean(setup.modules?.faust),
        wam: Boolean(setup.modules?.wam),
        mic: Boolean(setup.modules?.mic),
        micMode: setup.modules?.micMode || 'keysync',
      },
      routing: {
        mic_to_rave: Boolean(setup.routing?.mic_to_rave),
        quantizeCue: setup.routing?.quantizeCue !== false,
      },
    },
    initial_states: { strudel, hydra, wam },
    constraints: constraint,
    syntax: guarded.validation,
    model,
    provider,
    scale: parseScaleFromCode(strudel),
  };
}
