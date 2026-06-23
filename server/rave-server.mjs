#!/usr/bin/env node
/**
 * RAVE neural audio bridge — WebSocket :8765
 * Browser PCM ↔ ONNX (or passthrough) ↔ Browser
 *
 * npm run rave:server
 * RAVE_MODEL_PATH=/path/to/rave.onnx npm run rave:server
 */
import { WebSocketServer } from 'ws';
import { initRaveOnnx, transformPcmFrame, getRaveOnnxStatus } from './rave-onnx.mjs';

const PORT = Number(process.env.RAVE_PORT || 8765);
/** Float32 512 or 1024 samples → 2048 or 4096 bytes */
const EXPECTED_FRAME_BYTES = [2048, 4096];

await initRaveOnnx(process.env);
const onnxStatus = getRaveOnnxStatus();

const wss = new WebSocketServer({ port: PORT });
console.log(`RAVE bridge WebSocket :${PORT} — mode: ${onnxStatus.mode}`);

wss.on('connection', (ws) => {
  console.log('RAVE client verbunden');
  ws.send(
    JSON.stringify({
      type: 'rave-ready',
      mode: onnxStatus.mode,
      frameBytes: EXPECTED_FRAME_BYTES,
    }),
  );

  ws.on('message', async (data) => {
    const len = data.byteLength ?? data.length;
    if (!EXPECTED_FRAME_BYTES.includes(len) && len > 0) {
      console.warn(`RAVE: Frame ${len} bytes (erwarte 2048/4096)`);
    }

    const input = new Float32Array(data.buffer, data.byteOffset, len / 4);
    const output = await transformPcmFrame(input);
    const buf = Buffer.from(output.buffer, output.byteOffset, output.byteLength);
    if (ws.readyState === 1) ws.send(buf);
  });

  ws.on('close', () => console.log('RAVE client getrennt'));
});

setInterval(() => {
  const s = getRaveOnnxStatus();
  if (s.mode === 'onnx' && s.lastInferMs > 15) {
    console.warn(`[rave] Inferenz ${s.lastInferMs}ms (>15ms Latenz-Budget)`);
  }
}, 10000);
