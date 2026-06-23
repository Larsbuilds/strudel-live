/**
 * WebSocket broadcast for Ableton Link clock (~60 Hz from native addon).
 * Path: /api/link/ws
 */
import { WebSocketServer } from 'ws';
import { onLinkTick, getLinkState, linkCpm } from './link-clock.mjs';

let wss = null;
let unsubscribe = null;

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
  if (!wss) return;
  const raw = JSON.stringify(clockPayload());
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(raw);
  }
}

export function attachLinkWebSocket(httpServer) {
  if (wss) return wss;

  wss = new WebSocketServer({ server: httpServer, path: '/api/link/ws' });

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
