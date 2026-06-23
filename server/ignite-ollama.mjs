import { applyMusicConstraints } from './music-constraints.mjs';
import { guardStrudelCode } from './code-validate.mjs';
import { parseScaleFromCode } from './parse-scale.mjs';
import { generateStrudel } from './generate.mjs';
import { isWeakStrudel, resolvePresetForPrompt } from './pattern-presets.mjs';
import { repairStrudelCode } from './llm-repair.mjs';

function inferBpm(prompt) {
  const m = prompt.match(/(\d{2,3})\s*bpm/i);
  if (m) return Number(m[1]);
  if (/dnb|jungle|neuro|liquid/i.test(prompt)) return 174;
  if (/trance|uplifting|acid/i.test(prompt)) return 138;
  if (/schranz|hard|industrial/i.test(prompt)) return 150;
  if (/ambient|drone/i.test(prompt)) return 80;
  if (/downtempo|chill/i.test(prompt)) return 95;
  return 128;
}

function inferScale(prompt) {
  if (/major|dur/i.test(prompt) && !/minor|moll/i.test(prompt)) return 'A major';
  return 'A minor';
}

function gateModules(prompt) {
  const p = prompt.toLowerCase();
  return {
    hydra: /visual|hydra|beamer|proj|farbe|color|neon|strob/i.test(p),
    stems: /stem|dj.?track|soundcloud|stem-reactive/i.test(p),
    rave: /rave|neural.?voice|mic_to_rave/i.test(p),
    faust: /faust|custom dsp/i.test(p),
    wam: /wam|ob-?xd|dexed|analog synth|meld/i.test(p),
    mic: /sing|vocal|mic|voice|mitsingen|keysync|live dazu/i.test(p),
    micMode: /autotune/i.test(p) ? 'autotune' : 'keysync',
  };
}

function defaultHydra(prompt) {
  const p = prompt.toLowerCase();
  if (/rot|red|strob|schranz|hard/i.test(p)) return 'osc(10,0.1).color(1,0.1,0.1).kaleid(4).out()';
  if (/cyan|blau|liquid|dnb/i.test(p)) return 'osc(8,0.05).color(0.2,0.8,1).rotate(0.1).out()';
  if (/lila|ambient|drone/i.test(p)) return 'gradient(0.2).color(0.4,0.1,0.6).out()';
  return 'osc(10,0.1).color(1,0.2,0.5).out()';
}

async function resolveStrudel(prompt, setup, env, trackContext) {
  const preset = resolvePresetForPrompt(prompt, { bpm: setup.bpm });
  if (preset) {
    const constraint = applyMusicConstraints(preset.code, setup);
    const guarded = guardStrudelCode(constraint.code);
    return {
      code: guarded.code,
      syntax: guarded.validation,
      constraints: { ...constraint, fixes: [...(constraint.fixes || []), `preset:${preset.id}`] },
      strudelSource: 'preset',
      presetId: preset.id,
    };
  }

  const gen = await generateStrudel(
    `${prompt}. ${setup.bpm} BPM. Scale: ${setup.scale}.`,
    env,
    { trackContext },
  );

  if (!isWeakStrudel(gen.code)) return { ...gen, strudelSource: 'generate' };

  try {
    const repaired = await repairStrudelCode(gen.code, env, { error: gen.rejectedError });
    if (repaired.validation?.ok && !isWeakStrudel(repaired.code)) {
      return {
        code: repaired.code,
        syntax: repaired.validation,
        constraints: gen.constraints,
        strudelSource: repaired.repaired ? 'repair' : 'generate',
      };
    }
  } catch {
    /* fall through */
  }

  return { ...gen, strudelSource: 'generate-fallback' };
}

export async function generateIgniteOllama({ prompt, trackContext }, env) {
  const setup = {
    bpm: inferBpm(prompt),
    scale: inferScale(prompt),
  };
  const modules = gateModules(prompt);
  const strudelResult = await resolveStrudel(prompt, setup, env, trackContext);
  const hydra = modules.hydra ? defaultHydra(prompt) : '';

  return {
    summary: `Ollama session — ${prompt.slice(0, 72)}`,
    setup: {
      bpm: setup.bpm,
      scale: setup.scale,
      modules: {
        hydra: modules.hydra && Boolean(hydra),
        stems: modules.stems,
        rave: modules.rave,
        faust: modules.faust,
        wam: modules.wam,
        mic: modules.mic && !/rave|neural/i.test(prompt),
        micMode: modules.micMode,
      },
      routing: {
        mic_to_rave: modules.rave && /sing|vocal|voice|mitsingen/i.test(prompt),
        quantizeCue: true,
      },
    },
    initial_states: { strudel: strudelResult.code, hydra, wam: {} },
    constraints: strudelResult.constraints,
    syntax: strudelResult.syntax,
    strudelSource: strudelResult.strudelSource,
    presetId: strudelResult.presetId,
    model: env.OLLAMA_MODEL || 'strudel-live',
    provider: 'ollama',
    scale: parseScaleFromCode(strudelResult.code),
  };
}
