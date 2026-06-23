/**
 * WebSocket broadcast for Ableton Link clock (~15 Hz from native addon).
 * Path: /api/link/ws
 *
 * Uses noServer + manual upgrade routing so Vite HMR (/?token=…) is not broken.
 */
import { WebSocketServer } from 'ws';
import { onLinkTick, getLinkState, linkCpm } from './link-clock.mjs';

const LINK_WS_PATH = '/api/link/ws';

let wss = null;
let unsubscribe = null;
let upgradeAttached = false;
let lastBroadcastAt = 0;
const BROADCAST_MIN_MS = 100;

function clockPayload() {
  const s = getLinkState();
  return {
    type: 'LINK_CLOCK_UPDATE',
    payload: {
      ...s,
      cpm: linkCpm(),
      serverTime: Date.now(),
    },
  };
}

function broadcast() {
  if (!wss || wss.clients.size === 0) return;
  const now = Date.now();
  if (now - lastBroadcastAt < BROADCAST_MIN_MS) return;
  lastBroadcastAt = now;
  const raw = JSON.stringify(clockPayload());
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(raw);
  }
}

function onUpgrade(request, socket, head) {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  if (pathname !== LINK_WS_PATH) return;

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
}

export function attachLinkWebSocket(httpServer) {
  if (wss) return wss;

  wss = new WebSocketServer({ noServer: true });

  if (!upgradeAttached) {
    httpServer.on('upgrade', onUpgrade);
    upgradeAttached = true;
  }

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify(clockPayload()));
  });

  unsubscribe = onLinkTick(() => broadcast());

  console.log('[link] WebSocket /api/link/ws');
  return wss;
}

export function closeLinkWebSocket() {
  unsubscribe?.();
  unsubscribe = null;
  wss?.close();
  wss = null;
}
