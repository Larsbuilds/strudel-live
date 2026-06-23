import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadManifest } from './manifest.mjs';
import { listPatternNames } from './patterns-list.mjs';
import { checkSuperCollider } from './sc-send.mjs';

function portOpen(port) {
  const r = spawnSync('lsof', [`-i:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return r.status === 0 && Boolean(r.stdout?.trim());
}

function cmdExists(cmd) {
  return spawnSync('which', [cmd], { encoding: 'utf8' }).status === 0;
}

export function getHealth(env) {
  const manifest = loadManifest();
  const trackCount = Object.keys(manifest.tracks || {}).length;

  return {
    ok: true,
    version: '0.4.0',
    ai: Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY),
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
      samples: portOpen(5432),
      app: portOpen(5173) || portOpen(5174),
    },
    paths: {
      samples: existsSync(join(process.cwd(), 'samples')),
      manifest: existsSync(join(process.cwd(), 'samples', 'manifest.json')),
      env: existsSync(join(process.cwd(), '.env')),
    },
  };
}
