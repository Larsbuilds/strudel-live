import { IGNITE_PROMPT, buildIgniteUserMessage } from './ignite-prompt.mjs';
import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode, validateStrudelSyntax } from './code-validate.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { stripCodeFences } from './llm-utils.mjs';
import { getLlmProvider, callLLM } from './llm-call.mjs';
import { generateStrudel } from './generate.mjs';
import { isWeakStrudel, resolvePresetForPrompt } from './pattern-presets.mjs';

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

function isPlaceholderStrudel(code) {
  if (!code?.trim()) return true;
  const lower = code.toLowerCase();
  if (/valid strudel code|placeholder|example pattern/i.test(lower)) return true;
  return !/\b(setcpm|s\(|note\(|stack\(|sound\()/.test(code);
}

function isPlaceholderHydra(code) {
  if (!code?.trim()) return true;
  const lower = code.toLowerCase();
  return /hydra code ending|hypdra|placeholder/i.test(lower) && code.length < 80;
}

/** Ollama often enables modules randomly — gate on explicit prompt keywords. */
function gateModules(modules, prompt) {
  const p = prompt.toLowerCase();
  return {
    hydra: Boolean(modules?.hydra) && /visual|hydra|beamer|proj|farbe|color|neon|strob/i.test(p),
    stems: Boolean(modules?.stems) && /stem|dj.?track|soundcloud/i.test(p),
    rave: Boolean(modules?.rave) && /rave|neural.?voice/i.test(p),
    faust: Boolean(modules?.faust) && /faust|custom dsp/i.test(p),
    wam: Boolean(modules?.wam) && /wam|ob-?xd|dexed|analog synth|meld/i.test(p),
    mic: Boolean(modules?.mic) && /sing|vocal|mic|voice|mitsingen|keysync|live dazu/i.test(p),
    micMode: modules?.micMode || 'keysync',
  };
}

async function applyPresetIfNeeded({ prompt, setup, code, env, trackContext }) {
  if (!isWeakStrudel(code)) return null;
  const preset = resolvePresetForPrompt(prompt, { bpm: setup.bpm });
  if (!preset) return null;
  const constraint = applyMusicConstraints(preset.code, {
    bpm: setup.bpm,
    scale: setup.scale,
  });
  try {
    const guarded = guardStrudelCode(constraint.code);
    return {
      code: guarded.code,
      syntax: guarded.validation,
      constraints: { ...constraint, fixes: [...(constraint.fixes || []), `preset:${preset.id}`] },
      strudelSource: 'preset',
      presetId: preset.id,
    };
  } catch {
    return null;
  }
}

async function resolveIgniteStrudel({ prompt, trackContext, setup, candidate }, env) {
  const stripped = stripCodeFences(candidate || '');
  if (!isPlaceholderStrudel(stripped)) {
    const v = validateStrudelSyntax(stripped);
    if (v.ok) {
      const constraint = applyMusicConstraints(stripped, {
        bpm: setup.bpm,
        scale: setup.scale,
      });
      try {
        const guarded = guardStrudelCode(constraint.code);
        const result = {
          code: guarded.code,
          syntax: guarded.validation,
          constraints: constraint,
          strudelSource: 'ignite-json',
        };
        const preset = await applyPresetIfNeeded({
          prompt,
          setup,
          code: result.code,
          env,
          trackContext,
        });
        return preset || result;
      } catch {
        /* fall through */
      }
    }
  }

  const presetFirst = resolvePresetForPrompt(prompt, { bpm: setup.bpm });
  if (presetFirst) {
    const constraint = applyMusicConstraints(presetFirst.code, {
      bpm: setup.bpm,
      scale: setup.scale,
    });
    try {
      const guarded = guardStrudelCode(constraint.code);
      return {
        code: guarded.code,
        syntax: guarded.validation,
        constraints: { ...constraint, fixes: [...(constraint.fixes || []), `preset:${presetFirst.id}`] },
        strudelSource: 'preset',
        presetId: presetFirst.id,
      };
    } catch {
      /* fall through */
    }
  }

  const genPrompt = `${prompt}. ${setup.bpm ? `${setup.bpm} BPM.` : ''}${setup.scale ? ` Scale: ${setup.scale}.` : ''}`;
  const gen = await generateStrudel(genPrompt, env, { trackContext });
  const presetAfter = await applyPresetIfNeeded({
    prompt,
    setup,
    code: gen.code,
    env,
    trackContext,
  });
  if (presetAfter) return presetAfter;
  return {
    code: gen.code,
    syntax: gen.syntax,
    constraints: gen.constraints,
    strudelSource: 'generate-fallback',
  };
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

  const strudelResult = await resolveIgniteStrudel(
    { prompt, trackContext, setup, candidate: initial.strudel },
    env,
  );
  const strudel = strudelResult.code;

  let hydra = stripCodeFences(initial.hydra || '');
  if (isPlaceholderHydra(hydra)) hydra = '';
  const wam = initial.wam && typeof initial.wam === 'object' ? initial.wam : {};
  const modules = gateModules(setup.modules, prompt);

  return {
    summary: parsed.summary || 'Session ignited',
    setup: {
      bpm: setup.bpm || 120,
      scale: setup.scale || null,
      modules: {
        hydra: modules.hydra && Boolean(hydra),
        stems: modules.stems,
        rave: modules.rave,
        faust: modules.faust,
        wam: modules.wam,
        mic: modules.mic,
        micMode: modules.micMode,
      },
      routing: {
        mic_to_rave: Boolean(setup.routing?.mic_to_rave),
        quantizeCue: setup.routing?.quantizeCue !== false,
      },
    },
    initial_states: { strudel, hydra, wam },
    constraints: strudelResult.constraints,
    syntax: strudelResult.syntax,
    strudelSource: strudelResult.strudelSource,
    presetId: strudelResult.presetId,
    model,
    provider,
    scale: parseScaleFromCode(strudel),
  };
}
