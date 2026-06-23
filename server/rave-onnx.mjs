/**
 * RAVE inference via ONNX Runtime — passthrough wenn kein Modell.
 *
 * Env:
 *   RAVE_MODEL_PATH=/path/to/model.onnx
 *   RAVE_EXECUTION_PROVIDER=cpu|cuda
 */
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const SUPPORTED_FRAME_SIZES = [512, 1024];

let ort = null;
let session = null;
let inputName = null;
let outputName = null;
let mode = 'passthrough';
let lastInferMs = 0;
let executionProvider = 'cpu';
const pools = new Map();

class FramePool {
  constructor(frameSize, TensorCtor) {
    this.frameSize = frameSize;
    this.inputBuffer = new Float32Array(frameSize);
    this.outputBuffer = new Float32Array(frameSize);
    this.Tensor = TensorCtor;
  }

  writeInput(source) {
    const n = Math.min(source.length, this.frameSize);
    this.inputBuffer.fill(0);
    this.inputBuffer.set(source.subarray(0, n));
    return n;
  }

  createInputTensor() {
    return new this.Tensor('float32', this.inputBuffer, [1, 1, this.frameSize]);
  }

  readOutput(tensor) {
    const data = tensor?.data;
    if (!data) return this.outputBuffer;
    const n = Math.min(data.length, this.frameSize);
    this.outputBuffer.set(data.subarray(0, n));
    return this.outputBuffer;
  }
}

function getPool(frameSize) {
  if (!pools.has(frameSize)) {
    pools.set(frameSize, new FramePool(frameSize, ort.Tensor));
  }
  return pools.get(frameSize);
}

function buildSessionOptions(env) {
  const useCuda = env.RAVE_EXECUTION_PROVIDER === 'cuda';
  executionProvider = useCuda ? 'cuda' : 'cpu';
  return {
    executionProviders: useCuda ? [{ name: 'cuda', deviceId: 0 }] : ['cpu'],
    enableCpuMemArena: false,
    enableMemPattern: false,
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  };
}

export async function initRaveOnnx(env = process.env) {
  const modelPath = env.RAVE_MODEL_PATH;
  if (!modelPath || !existsSync(modelPath)) {
    mode = 'passthrough';
    pools.clear();
    return { mode, modelPath: modelPath || null, executionProvider };
  }

  try {
    ort = await import('onnxruntime-node');
    session = await ort.InferenceSession.create(modelPath, buildSessionOptions(env));
    inputName = session.inputNames[0];
    outputName = session.outputNames[0];
    mode = 'onnx';
    pools.clear();
    for (const size of SUPPORTED_FRAME_SIZES) {
      pools.set(size, new FramePool(size, ort.Tensor));
    }
    console.log(`[rave] ONNX geladen: ${modelPath} (${executionProvider})`);
    console.log(`[rave] inputs=${session.inputNames.join(',')} outputs=${session.outputNames.join(',')}`);
    return { mode, modelPath, inputName, outputName, executionProvider, poolSizes: [...pools.keys()] };
  } catch (err) {
    mode = 'passthrough';
    pools.clear();
    console.warn('[rave] ONNX load failed:', err.message);
    return { mode: 'passthrough', error: err.message, executionProvider };
  }
}

export function getRaveOnnxStatus() {
  return {
    mode,
    lastInferMs,
    inputName,
    outputName,
    executionProvider,
    poolSizes: [...pools.keys()],
    tensorPool: pools.size > 0,
  };
}

/**
 * Transform one PCM frame (Float32). Returns Float32Array (pooled buffer copy safe for caller).
 */
export async function transformPcmFrame(frame) {
  const input = frame instanceof Float32Array ? frame : new Float32Array(frame.buffer);
  const frameSize = input.length;

  if (!session || mode !== 'onnx') {
    return input;
  }

  if (!SUPPORTED_FRAME_SIZES.includes(frameSize)) {
    return input;
  }

  const pool = getPool(frameSize);
  pool.writeInput(input);
  const t0 = performance.now();

  try {
    const inputTensor = pool.createInputTensor();
    const result = await session.run({ [inputName]: inputTensor });
    lastInferMs = Math.round((performance.now() - t0) * 100) / 100;
    return pool.readOutput(result[outputName]);
  } catch {
    lastInferMs = Math.round((performance.now() - t0) * 100) / 100;
    return input;
  }
}
