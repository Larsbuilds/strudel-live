/**
 * Load Faust WASM from /api/faust as AudioWorkletNode in the Web Audio graph.
 */
let faustCtx = null;
let faustNode = null;
let blobUrls = [];

function decodeWasmPayload(wasmField) {
  if (!wasmField) return null;
  if (wasmField instanceof ArrayBuffer) return wasmField;
  if (typeof wasmField === 'string') {
    const bin = atob(wasmField);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  return null;
}

function buildFaustWorkletModule(wasmUrl, processorName) {
  return `
class FaustWasmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ready = false;
    this.port.onmessage = (e) => {
      if (e.data === 'init') this.ready = true;
    };
    this.port.postMessage('ready');
  }
  process(inputs, outputs) {
    const out = outputs[0]?.[0];
    const inp = inputs[0]?.[0];
    if (!out) return true;
    if (inp && this.ready) {
      for (let i = 0; i < out.length; i++) out[i] = inp[i];
    } else {
      out.fill(0);
    }
    return true;
  }
}
registerProcessor('${processorName}', FaustWasmProcessor);

(async () => {
  try {
    const response = await fetch('${wasmUrl}');
    const wasmBytes = await response.arrayBuffer();
    await WebAssembly.instantiate(wasmBytes, {});
  } catch (e) {
    console.warn('[faust] WASM preload:', e.message);
  }
})();
`;
}

export async function loadFaustFromApi(faustCode, { name = 'strudelLiveFaust' } = {}) {
  const res = await fetch('/api/faust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: faustCode, name }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Faust compile failed');

  unloadFaustNode();
  faustCtx = faustCtx || new AudioContext();
  if (faustCtx.state === 'suspended') await faustCtx.resume();

  const processorName = data.processorName || name;
  let workletSource = data.workletModule;

  const wasmBuffer = decodeWasmPayload(data.wasmBase64 || data.wasm);
  if (!workletSource && wasmBuffer) {
    const wasmUrl = URL.createObjectURL(new Blob([wasmBuffer], { type: 'application/wasm' }));
    blobUrls.push(wasmUrl);
    workletSource = buildFaustWorkletModule(wasmUrl, processorName);
  }

  if (!workletSource) {
    throw new Error('Kein WASM/Worklet von /api/faust — Faust-Service erreichbar?');
  }

  const workletUrl = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }));
  blobUrls.push(workletUrl);

  await faustCtx.audioWorklet.addModule(workletUrl);
  faustNode = new AudioWorkletNode(faustCtx, processorName, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  faustNode.connect(faustCtx.destination);

  return { ctx: faustCtx, node: faustNode, name: processorName };
}

export function unloadFaustNode() {
  faustNode?.disconnect();
  faustNode = null;
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls = [];
}

export function initFaustPanel() {
  const form = document.getElementById('faust-form');
  const codeEl = document.getElementById('faust-code');
  const status = document.getElementById('faust-status');
  const unloadBtn = document.getElementById('faust-unload');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeEl?.value?.trim();
    if (!code) return;
    if (status) {
      status.dataset.state = 'loading';
      status.textContent = 'Faust → WASM → AudioWorklet…';
    }
    try {
      const { name } = await loadFaustFromApi(code);
      if (status) {
        status.dataset.state = 'ok';
        status.textContent = `Faust geladen: ${name}`;
      }
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = err.message;
      }
    }
  });

  unloadBtn?.addEventListener('click', () => {
    unloadFaustNode();
    if (status) status.textContent = 'Faust entladen.';
  });
}
