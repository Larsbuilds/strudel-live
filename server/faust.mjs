/**
 * Compile Faust DSP via Grame remote service → WASM + worklet for browser.
 * Uses multipart file upload (filepost + compile/web/wasmjs).
 */
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);
const FAUST_BASE = 'https://faustservice.grame.fr';
const COMPILE_PATH = '/compile/web/wasmjs/binary.zip';
const TIMEOUT_MS = 45000;

async function compileViaRemoteService(faustCode, name) {
  const dir = await mkdtemp(join(tmpdir(), 'strudel-faust-'));
  const dspPath = join(dir, `${name}.dsp`);
  const zipPath = join(dir, 'out.zip');

  try {
    await writeFile(dspPath, faustCode.trim(), 'utf8');

    await execFileAsync(
      'curl',
      [
        '-sS',
        '--max-time',
        String(Math.floor(TIMEOUT_MS / 1000)),
        '-F',
        `file=@${dspPath};filename=${name}.dsp`,
        `${FAUST_BASE}${COMPILE_PATH}`,
        '--output',
        zipPath,
      ],
      { timeout: TIMEOUT_MS + 5000 },
    );

    const { stdout: listing } = await execFileAsync('unzip', ['-Z1', zipPath], { timeout: 10000 });
    const files = listing.split('\n').filter(Boolean);
    await execFileAsync('unzip', ['-o', zipPath, '-d', dir], { timeout: 10000 });

    const wasmFile = files.find((f) => f.endsWith('.wasm'));
    const jsFile =
      files.find((f) => f.includes('worklet') && f.endsWith('.js')) ||
      files.find((f) => f.endsWith('-processor.js')) ||
      files.find((f) => f.endsWith('.js') && !f.includes('index'));

    if (!wasmFile) {
      throw new Error(`Faust zip ohne .wasm — ${files.join(', ') || 'leer'}`);
    }

    const wasmBuf = await readFile(join(dir, wasmFile));
    let workletModule = null;
    if (jsFile) {
      workletModule = await readFile(join(dir, jsFile), 'utf8');
    }

    return {
      wasmBase64: wasmBuf.toString('base64'),
      workletModule,
      processorName: name,
      files,
      service: `${FAUST_BASE}${COMPILE_PATH}`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function compileFaustToWasm(faustCode, options = {}) {
  if (!faustCode?.trim()) throw Object.assign(new Error('Faust code is empty'), { status: 400 });

  const name = (options.name || 'strudelLiveFaust').replace(/[^a-zA-Z0-9_]/g, '_');

  try {
    return await compileViaRemoteService(faustCode, name);
  } catch (err) {
    const hint =
      err.message?.includes('curl') || err.message?.includes('unzip')
        ? 'curl + unzip benötigt; Faust-Service evtl. offline'
        : 'Faust-Service nicht erreichbar — später erneut versuchen';
    throw Object.assign(new Error(`${hint}: ${err.message}`), { status: 502 });
  }
}
