import { connectToMaster } from './audio-bus.js';
const RAVE_WS = `ws://${location.hostname}:8765`;
const CAPTURE_WORKLET = `
class RaveCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.frameSize = options.processorOptions?.frameSize ?? 512;
    this.buf = new Float32Array(0);
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    const merged = new Float32Array(this.buf.length + ch.length);
    merged.set(this.buf);
    merged.set(ch, this.buf.length);
    this.buf = merged;
    while (this.buf.length >= this.frameSize) {
      const frame = this.buf.slice(0, this.frameSize);
      this.buf = this.buf.slice(this.frameSize);
      this.port.postMessage(frame);
    }
    return true;
  }
}
registerProcessor('rave-capture', RaveCaptureProcessor);
`;

const PLAYBACK_WORKLET = `
class RavePlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.port.onmessage = (e) => {
      if (e.data instanceof Float32Array) this.queue.push(e.data);
    };
  }
  process(inputs, outputs) {
    const out = outputs[0]?.[0];
    if (!out) return true;
    let i = 0;
    while (i < out.length) {
      if (!this.queue.length) {
        out.fill(0, i);
        break;
      }
      const chunk = this.queue[0];
      const n = Math.min(chunk.length, out.length - i);
      out.set(chunk.subarray(0, n), i);
      i += n;
      if (n >= chunk.length) this.queue.shift();
      else this.queue[0] = chunk.subarray(n);
    }
    return true;
  }
}
registerProcessor('rave-playback', RavePlaybackProcessor);
`;

let raveCtx = null;
let raveWs = null;
let raveStream = null;
let captureNode = null;
let playbackNode = null;
let blobUrls = [];
let raveStatusEl = null;

async function assertRaveServer() {
  const res = await fetch('/api/health');
  const data = await res.json();
  if (!data.servers?.rave) {
    throw new Error('RAVE offline — npm run rave:server');
  }
}

function workletUrl(source) {
  const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
  blobUrls.push(url);
  return url;
}

export async function startRaveClient(frameSize = 512) {
  if (frameSize !== 512 && frameSize !== 1024) {
    throw new Error('RAVE frame size must be 512 or 1024');
  }

  await assertRaveServer();

  stopRaveClient();

  raveCtx = new AudioContext();
  if (raveCtx.state === 'suspended') await raveCtx.resume();

  await raveCtx.audioWorklet.addModule(workletUrl(CAPTURE_WORKLET));
  await raveCtx.audioWorklet.addModule(workletUrl(PLAYBACK_WORKLET));

  raveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = raveCtx.createMediaStreamSource(raveStream);

  captureNode = new AudioWorkletNode(raveCtx, 'rave-capture', {
    processorOptions: { frameSize },
  });
  playbackNode = new AudioWorkletNode(raveCtx, 'rave-playback');
  connectToMaster(playbackNode, raveCtx);

  source.connect(captureNode);

  raveWs = new WebSocket(RAVE_WS);
  raveWs.binaryType = 'arraybuffer';
  raveWs.onerror = () => {
    /* surfaced via status line — avoid duplicate console noise when server drops */
  };

  captureNode.port.onmessage = (e) => {
    if (raveWs?.readyState === WebSocket.OPEN) {
      raveWs.send(e.data.buffer);
    }
  };

  raveWs.onmessage = (ev) => {
    if (typeof ev.data === 'string') {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'rave-ready' && raveStatusEl) {
          raveStatusEl.dataset.mode = msg.mode;
        }
      } catch {
        /* ignore */
      }
      return;
    }
    if (ev.data instanceof ArrayBuffer) {
      playbackNode.port.postMessage(new Float32Array(ev.data));
    }
  };

  return { frameSize, ws: RAVE_WS };
}

export function stopRaveClient() {
  captureNode?.disconnect();
  playbackNode?.disconnect();
  captureNode = null;
  playbackNode = null;
  raveWs?.close();
  raveWs = null;
  raveStream?.getTracks().forEach((t) => t.stop());
  raveStream = null;
  if (raveCtx?.state !== 'closed') raveCtx?.close();
  raveCtx = null;
  for (const u of blobUrls) URL.revokeObjectURL(u);
  blobUrls = [];
}

export function initRavePanel() {
  const startBtn = document.getElementById('rave-start');
  const stopBtn = document.getElementById('rave-stop');
  const frameSelect = document.getElementById('rave-frame-size');
  const status = document.getElementById('rave-status');
  raveStatusEl = status;

  startBtn?.addEventListener('click', async () => {
    const frameSize = Number(frameSelect?.value || 512);
    if (status) status.textContent = `RAVE verbinden (${frameSize} samples)…`;
    try {
      const info = await startRaveClient(frameSize);
      if (status) {
        status.dataset.state = 'ok';
        const mode = status.dataset.mode || 'passthrough';
        status.textContent = `RAVE aktiv (${mode}) — ${info.ws} · ${frameSize} samples/frame`;
      }
    } catch (err) {
      if (status) {
        status.dataset.state = 'error';
        status.textContent = err.message;
      }
    }
  });

  stopBtn?.addEventListener('click', () => {
    stopRaveClient();
    if (status) status.textContent = 'RAVE gestoppt.';
  });
}
