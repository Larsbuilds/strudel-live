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

  if (url === '/api/patterns' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, patterns: loadAllPatterns() });
    return true;
  }

  if (url === '/api/status' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      configured: Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY),
      whisper: Boolean(env.OPENAI_API_KEY),
      providers: {
        openai: Boolean(env.OPENAI_API_KEY),
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
      },
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
