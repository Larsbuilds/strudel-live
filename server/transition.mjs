import { TRANSITION_PROMPT, buildTransitionUserMessage } from './transition-prompt.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { callLLM, codeFromAgent, getLlmProvider } from './llm-call.mjs';
import { isWeakStrudel, resolvePresetForPrompt } from './pattern-presets.mjs';

const SAFE_FALLBACK = 'setcpm(30)\nstack(s("bd*4"), s("~ sd"))';

export async function generateTransition({ fromTrack, toPrompt, bars }, env) {
  const provider = getLlmProvider(env);
  if (!provider) {
    throw Object.assign(new Error('No AI provider configured'), { status: 503 });
  }
  if (!toPrompt?.trim()) {
    throw Object.assign(new Error('Target prompt is empty'), { status: 400 });
  }

  const userMessage = buildTransitionUserMessage({ fromTrack, toPrompt, bars });
  const { text, model, provider: usedProvider } = await callLLM(
    TRANSITION_PROMPT,
    userMessage,
    env,
    { maxTokens: 1500 },
  );

  let code = codeFromAgent(text);
  const constraint = applyMusicConstraints(code, { bpm: fromTrack?.bpm });
  code = constraint.code;

  if (isWeakStrudel(code)) {
    const preset = resolvePresetForPrompt(toPrompt, { bpm: fromTrack?.bpm });
    if (preset) code = applyMusicConstraints(preset.code, { bpm: fromTrack?.bpm }).code;
  }

  const guarded = guardStrudelCode(code, { fallback: SAFE_FALLBACK });

  return {
    code: guarded.code,
    model,
    provider: usedProvider,
    scale: parseScaleFromCode(guarded.code),
    constraints: constraint,
  };
}
