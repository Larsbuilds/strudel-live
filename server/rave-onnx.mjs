/**
 * RAVE inference via ONNX Runtime — passthrough wenn kein Modell.
 * Env: RAVE_MODEL_PATH=/path/to/model.onnx
 */
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

let session = null;
let inputName = null;
let outputName = null;
let mode = 'passthrough';
let lastInferMs = 0;

export async function initRaveOnnx(env = process.env) {
  const modelPath = env.RAVE_MODEL_PATH;
  if (!modelPath || !existsSync(modelPath)) {
    mode = 'passthrough';
    return { mode, modelPath: modelPath || null };
  }

  try {
    const ort = await import('onnxruntime-node');
    session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
    });
    inputName = session.inputNames[0];
    outputName = session.outputNames[0];
    mode = 'onnx';
    console.log(`[rave] ONNX geladen: ${modelPath}`);
    console.log(`[rave] inputs=${session.inputNames.join(',')} outputs=${session.outputNames.join(',')}`);
    return { mode, modelPath, inputName, outputName };
  } catch (err) {
    mode = 'passthrough';
    console.warn('[rave] ONNX load failed:', err.message);
    return { mode: 'passthrough', error: err.message };
  }
}

export function getRaveOnnxStatus() {
  return { mode, lastInferMs, inputName, outputName };
}

/**
 * Transform one PCM frame (Float32). Returns Float32Array same length or passthrough.
 */
export async function transformPcmFrame(frame) {
  const input = frame instanceof Float32Array ? frame : new Float32Array(frame.buffer);

  if (!session || mode !== 'onnx') {
    return input;
  }

  const t0 = performance.now();
  try {
    const ort = await import('onnxruntime-node');
    const feeds = {
      [inputName]: new ort.Tensor('float32', input, [1, input.length]),
    };
    const result = await session.run(feeds);
    const out = result[outputName];
    lastInferMs = Math.round((performance.now() - t0) * 100) / 100;
    if (out?.data) return new Float32Array(out.data);
    return input;
  } catch {
    lastInferMs = Math.round((performance.now() - t0) * 100) / 100;
    return input;
  }
}
