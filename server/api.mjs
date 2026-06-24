import { loadEnv } from 'vite';
import { readJsonBody, sendJson } from './http-utils.mjs';
import { generateStrudel } from './generate.mjs';
import { transcribeAudio } from './transcribe.mjs';
import { savePattern } from './save-pattern.mjs';
import { loadManifest } from './manifest.mjs';
import { generateTransition } from './transition.mjs';
import { generateSynthDef } from './synthdef.mjs';
import { generateHydra } from './hydra.mjs';
import { generateConduct } from './conductor.mjs';
import { compileFaustToWasm } from './faust.mjs';
import { generateIgnite } from './ignite.mjs';
import { sendSynthDefToSuperCollider, checkSuperCollider } from './sc-send.mjs';
import { loadAllPatterns } from './patterns-list.mjs';
import { getHealth } from './health.mjs';
import { triggerPanic, getLastPanicAt } from './panic-bus.mjs';
import { bootServerServices } from './boot.mjs';
import { ensureLinkClock, getLinkState, setLinkBpm, linkCpm } from './link-clock.mjs';
import { resolveIntents, intentSummary, resolveIntentsSemantic, intentDbStats } from './intent-db.mjs';
import { listConcepts, listFunctions } from './strudel-catalog.mjs';
import { planAgentActions } from './strudel-agent.mjs';
import { checkEmbeddings } from './embeddings.mjs';
import { loadIntentExamples } from './semantic-retrieval.mjs';
import { catalogStats } from './catalog-loader.mjs';
import { checkOllama, getOllamaModel, getSyntaxModel, isDualLlmEnabled } from './ollama.mjs';

let bootPromise = null;
function ensureBoot(env) {
  if (!bootPromise) bootPromise = bootServerServices(env);
  return bootPromise;
}

function getEnv(mode = 'development') {
  return loadEnv(mode, process.cwd(), '');
}

export async function handleApiRequest(req, res, env) {
  const url = req.url?.split('?')[0];

  if (url === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, getHealth(env));
    return true;
  }

  if (url?.startsWith('/api/agent/plan') && req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const q = params.get('prompt') || '';
    const previousCode = params.get('previousCode') || '';
    const plan = planAgentActions(q, { previousCode });
    sendJson(res, 200, { ok: true, prompt: q, ...plan });
    return true;
  }

  if (url === '/api/catalog' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, concepts: listConcepts(), functions: listFunctions() });
    return true;
  }

  if (url === '/api/semantic/status' && req.method === 'GET') {
    const embed = await checkEmbeddings(env);
    sendJson(res, 200, {
      ok: true,
      intentExamples: loadIntentExamples().length,
      retrieval: intentDbStats(),
      catalog: catalogStats(),
      embeddings: embed,
    });
    return true;
  }

  if (url?.startsWith('/api/intent') && req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const q = params.get('prompt') || '';
    const semantic = params.get('semantic') === 'true';
    if (semantic) {
      const result = await resolveIntentsSemantic(q, env);
      sendJson(res, 200, {
        ok: true,
        prompt: q,
        method: result.method,
        embedAvailable: result.embedAvailable,
        intents: result.intents.map((i) => ({
          id: i.id,
          label: i.label,
          concept: i.concept,
          variant: i.variant,
          confidence: i.confidence,
          method: i.method,
          layer: i.layer,
        })),
        labels: result.intents.map((i) => i.label),
      });
      return true;
    }
    const intents = resolveIntents(q);
    sendJson(res, 200, {
      ok: true,
      prompt: q,
      intents: intents.map((i) => ({ id: i.id, label: i.label, layer: i.layer })),
      labels: intentSummary(q),
    });
    return true;
  }

  if (url === '/api/patterns' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, patterns: loadAllPatterns() });
    return true;
  }

  if (url === '/api/status' && req.method === 'GET') {
    const ollamaOn = env.AI_PROVIDER === 'ollama' || env.USE_OLLAMA === 'true';
    const ollama =
      ollamaOn
        ? {
            model: getOllamaModel(env),
            syntaxModel: getSyntaxModel(env),
            dualLlm: isDualLlmEnabled(env),
            ...(await checkOllama(env)),
          }
        : null;
    sendJson(res, 200, {
      ok: true,
      configured: Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || ollamaOn),
      whisper: Boolean(env.OPENAI_API_KEY),
      activeProvider: env.AI_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : ollamaOn ? 'ollama' : null),
      providers: {
        openai: Boolean(env.OPENAI_API_KEY),
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
        ollama: ollamaOn,
      },
      ollama,
    });
    return true;
  }

  if (url === '/api/generate' && req.method === 'POST') {
    try {
      const { prompt, previousCode, trackContext } = await readJsonBody(req);
      const result = await generateStrudel(prompt, env, { previousCode, trackContext });
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/transcribe' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = await transcribeAudio(body, env);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/save-pattern' && req.method === 'POST') {
    try {
      const { code, name } = await readJsonBody(req);
      if (!code?.trim()) throw Object.assign(new Error('No code to save'), { status: 400 });
      const saved = savePattern({ code, name });
      sendJson(res, 200, { ok: true, ...saved });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/dj/manifest' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, manifest: loadManifest() });
    return true;
  }

  if (url === '/api/transition' && req.method === 'POST') {
    try {
      const { fromTrack, toPrompt, bars } = await readJsonBody(req);
      const result = await generateTransition({ fromTrack, toPrompt, bars }, env);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/synthdef' && req.method === 'POST') {
    try {
      const { prompt } = await readJsonBody(req);
      const result = await generateSynthDef(prompt, env);
      sendJson(res, 200, { ok: true, ...result, scAvailable: checkSuperCollider() });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/synthdef/send' && req.method === 'POST') {
    try {
      const { code } = await readJsonBody(req);
      if (!code?.trim()) throw Object.assign(new Error('No SynthDef code'), { status: 400 });
      const result = sendSynthDefToSuperCollider(code);
      sendJson(res, result.ok ? 200 : 500, { ok: result.ok, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/hydra' && req.method === 'POST') {
    try {
      const { prompt, stemLevels } = await readJsonBody(req);
      const result = await generateHydra(prompt, env, { stemLevels });
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/conduct' && req.method === 'POST') {
    try {
      const { prompt, fromTrack, stemLevels } = await readJsonBody(req);
      const result = await generateConduct({ prompt, fromTrack, stemLevels }, env);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/ignite' && req.method === 'POST') {
    try {
      const { prompt, trackContext } = await readJsonBody(req);
      const result = await generateIgnite({ prompt, trackContext }, env);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/faust' && req.method === 'POST') {
    try {
      const { code, name } = await readJsonBody(req);
      const result = await compileFaustToWasm(code, { name });
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  if (url === '/api/panic' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, at: getLastPanicAt() });
    return true;
  }

  if (url === '/api/panic' && req.method === 'POST') {
    const at = triggerPanic();
    sendJson(res, 200, { ok: true, at, message: 'Panic signal sent — browser will mute' });
    return true;
  }

  if (url === '/api/link' && req.method === 'GET') {
    await ensureLinkClock(env);
    const s = getLinkState();
    sendJson(res, 200, { ok: true, ...s, cpm: linkCpm() });
    return true;
  }

  if (url === '/api/link' && req.method === 'POST') {
    await ensureLinkClock(env);
    try {
      const body = await readJsonBody(req);
      if (body.bpm != null) {
        const bpm = Number(body.bpm);
        if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300) {
          throw Object.assign(new Error('BPM must be 20–300'), { status: 400 });
        }
        setLinkBpm(bpm);
      }
      sendJson(res, 200, { ok: true, ...getLinkState(), cpm: linkCpm() });
    } catch (err) {
      sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
    return true;
  }

  return false;
}

export function createApiMiddleware(mode = 'development') {
  const env = getEnv(mode);
  ensureBoot(env);
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const handled = await handleApiRequest(req, res, env);
    if (handled) return;
    next();
  };
}

export { getEnv };
