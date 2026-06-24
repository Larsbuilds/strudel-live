import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadManifest } from './manifest.mjs';
import { listPatternNames } from './patterns-list.mjs';
import { checkSuperCollider } from './sc-send.mjs';
import { getLinkState } from './link-clock.mjs';
import { getRaveOnnxStatus } from './rave-onnx.mjs';
import { checkOllama, getOllamaModel, getSyntaxModel, isDualLlmEnabled } from './ollama.mjs';

function portOpen(port) {
  const r = spawnSync('lsof', [`-i:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return r.status === 0 && Boolean(r.stdout?.trim());
}

function cmdExists(cmd) {
  return spawnSync('which', [cmd], { encoding: 'utf8' }).status === 0;
}

function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function getHealth(env) {
  const manifest = loadManifest();
  const trackCount = Object.keys(manifest.tracks || {}).length;

  return {
    ok: true,
    version: getAppVersion(),
    ai: Boolean(
      env.OPENAI_API_KEY ||
        env.ANTHROPIC_API_KEY ||
        env.AI_PROVIDER === 'ollama' ||
        env.USE_OLLAMA === 'true',
    ),
    whisper: Boolean(env.OPENAI_API_KEY),
    patterns: listPatternNames().length,
    djTracks: trackCount,
    tools: {
      ffmpeg: cmdExists('ffmpeg'),
      ytDlp: true,
      demucs: cmdExists('demucs'),
      sclang: checkSuperCollider(),
    },
    servers: {
      samples: portOpen(5433) || portOpen(5432),
      app: portOpen(5173) || portOpen(5174),
      rave: portOpen(Number(process.env.RAVE_PORT || 8765)),
    },
    paths: {
      samples: existsSync(join(process.cwd(), 'samples')),
      manifest: existsSync(join(process.cwd(), 'samples', 'manifest.json')),
      env: existsSync(join(process.cwd(), '.env')),
    },
    link: getLinkState(),
    rave: getRaveOnnxStatus(),
    ollama: {
      configured: env.AI_PROVIDER === 'ollama' || env.USE_OLLAMA === 'true',
      model: getOllamaModel(env),
      syntaxModel: getSyntaxModel(env),
      dualLlm: isDualLlmEnabled(env),
      baseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
  };
}

export async function getHealthAsync(env) {
  const base = getHealth(env);
  if (base.ollama?.configured) {
    base.ollama = { ...base.ollama, ...(await checkOllama(env)) };
  }
  return base;
}
