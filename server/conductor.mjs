import { CONDUCTOR_PROMPT, buildConductorUserMessage } from './conductor-prompt.mjs';
import { AUDIO_AGENT_PROMPT, VIDEO_AGENT_PROMPT, SYNTH_AGENT_PROMPT } from './conductor-agents.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { stripCodeFences } from './llm-utils.mjs';
import { callLLM, codeFromAgent, parseJsonObject } from './llm-call.mjs';

function parseConductorJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Conductor response is not valid JSON');
  }
}

async function generateConductMono(args, env) {
  const userMessage = buildConductorUserMessage(args);
  const { text, model, provider } = await callLLM(CONDUCTOR_PROMPT, userMessage, env, {
    json: true,
    maxTokens: 2000,
  });
  const parsed = parseConductorJson(text);
  return {
    strudel: stripCodeFences(parsed.strudel || ''),
    hydra: stripCodeFences(parsed.hydra || ''),
    wam: parsed.wam && typeof parsed.wam === 'object' ? parsed.wam : {},
    model,
    provider,
    orchestration: 'mono',
  };
}

async function generateConductMulti(args, env) {
  const userMessage = buildConductorUserMessage(args);

  const [audioRes, videoRes, synthRes] = await Promise.all([
    callLLM(AUDIO_AGENT_PROMPT, userMessage, env, { maxTokens: 1500 }),
    callLLM(VIDEO_AGENT_PROMPT, userMessage, env, { maxTokens: 512 }),
    callLLM(SYNTH_AGENT_PROMPT, userMessage, env, { json: true, maxTokens: 256 }),
  ]);

  let wam = {};
  try {
    wam = parseJsonObject(synthRes.text);
  } catch {
    wam = {};
  }

  return {
    strudel: codeFromAgent(audioRes.text),
    hydra: codeFromAgent(videoRes.text),
    wam,
    model: audioRes.model,
    provider: audioRes.provider,
    orchestration: 'multi',
    agents: {
      audio: { model: audioRes.model },
      video: { model: videoRes.model },
      synth: { model: synthRes.model },
    },
  };
}

export async function generateConduct(args, env) {
  if (!args.prompt?.trim()) throw Object.assign(new Error('Prompt is empty'), { status: 400 });

  const mode = (env.CONDUCTOR_ORCHESTRATION || 'multi').toLowerCase();
  const raw =
    mode === 'mono' ? await generateConductMono(args, env) : await generateConductMulti(args, env);

  if (!raw.strudel) throw Object.assign(new Error('Conductor returned no strudel code'), { status: 502 });

  const constraint = applyMusicConstraints(raw.strudel, {
    bpm: args.fromTrack?.bpm,
    scale: args.fromTrack?.key,
  });

  const guarded = guardStrudelCode(constraint.code, { fallback: args.fallbackStrudel });

  return {
    strudel: guarded.code,
    hydra: raw.hydra,
    wam: raw.wam,
    constraints: constraint,
    syntax: guarded.validation,
    usedFallback: guarded.usedFallback,
    rejectedError: guarded.rejectedError,
    model: raw.model,
    provider: raw.provider,
    orchestration: raw.orchestration,
    agents: raw.agents,
    scale: parseScaleFromCode(guarded.code),
  };
}
