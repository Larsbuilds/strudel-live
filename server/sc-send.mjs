import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

export function sendSynthDefToSuperCollider(code) {
  const dir = join(process.cwd(), 'patterns', 'generated');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `synthdef-${randomBytes(4).toString('hex')}.scd`);
  writeFileSync(file, code.trim() + '\n', 'utf8');

  const sclang = spawnSync('which', ['sclang'], { encoding: 'utf8' });
  if (sclang.status !== 0 || !sclang.stdout.trim()) {
    return {
      ok: false,
      file,
      error: 'sclang not found — install SuperCollider (brew install --cask supercollider)',
    };
  }

  try {
    execSync(`sclang "${file}"`, { stdio: 'pipe', timeout: 30000 });
    return { ok: true, file, message: 'SynthDef compiled via sclang' };
  } catch (err) {
    return { ok: false, file, error: err.stderr?.toString() || err.message };
  }
}

export function checkSuperCollider() {
  const r = spawnSync('which', ['sclang'], { encoding: 'utf8' });
  return Boolean(r.stdout?.trim());
}
