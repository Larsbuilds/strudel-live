import { loadEnv } from 'vite';
import { readJsonBody, sendJson } from './http-utils.mjs';
import { generateStrudel } from './generate.mjs';
import { transcribeAudio } from './transcribe.mjs';
import { savePattern } from './save-pattern.mjs';
import { loadManifest } from './manifest.mjs';
import { generateTransition } from './transition.mjs';

function getEnv(mode = 'development') {
  return loadEnv(mode, process.cwd(), '');
}

export async function handleApiRequest(req, res, env) {
  const url = req.url?.split('?')[0];

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
      const { prompt, previousCode } = await readJsonBody(req);
      const result = await generateStrudel(prompt, env, { previousCode });
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

  return false;
}

export function createApiMiddleware(mode = 'development') {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const env = getEnv(mode);
    const handled = await handleApiRequest(req, res, env);
    if (handled) return;
    next();
  };
}

export { getEnv };
