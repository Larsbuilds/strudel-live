import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import OpenAI from 'openai';

export async function transcribeAudio({ audioBase64, mimeType = 'audio/webm' }, env) {
  if (!env.OPENAI_API_KEY) {
    throw Object.assign(new Error('Whisper requires OPENAI_API_KEY in .env'), { status: 503 });
  }
  if (!audioBase64) {
    throw Object.assign(new Error('No audio data'), { status: 400 });
  }

  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
  const tmpPath = join(tmpdir(), `strudel-live-${randomBytes(8).toString('hex')}.${ext}`);
  const buffer = Buffer.from(audioBase64, 'base64');
  writeFileSync(tmpPath, buffer);

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const model = env.WHISPER_MODEL || 'whisper-1';
    const result = await client.audio.transcriptions.create({
      file: (await import('node:fs')).createReadStream(tmpPath),
      model,
      language: env.WHISPER_LANGUAGE || 'de',
    });
    return { text: result.text?.trim() || '', model };
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}
