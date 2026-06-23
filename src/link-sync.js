/**
 * Ableton Link UI — WebSocket clock + optional PI scheduler sync.
 */
import { LinkPiSync } from './link-pi-sync.js';

const WS_PATH = '/api/link/ws';

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${WS_PATH}`;
}

function formatBeat(beat) {
  const bar = Math.floor(beat / 4) + 1;
  const beatInBar = (Math.floor(beat) % 4) + 1;
  return `${bar}.${beatInBar}`;
}

export function initLinkSync(editor) {
  const toggle = document.getElementById('link-sync-toggle');
  const status = document.getElementById('link-status');
  if (!toggle || !status) return;

  const pi = new LinkPiSync(editor);
  let ws = null;
  let reconnectTimer = null;
  let latestPayload = null;

  function setStatusLine(payload) {
    if (!payload?.available) {
      status.textContent = payload?.error ? `Link: ${payload.error}` : 'Link: nicht verfügbar';
      status.classList.remove('link-status--live');
      return;
    }
    status.classList.add('link-status--live');
    const peers = payload.peers > 0 ? ` · ${payload.peers} Peer(s)` : '';
    status.textContent = payload.enabled
      ? `Link ${Math.round(payload.bpm)} BPM · Takt ${formatBeat(payload.beat)}${peers}`
      : `Link bereit · ${Math.round(payload.bpm)} BPM`;
  }

  async function onClockMessage(payload) {
    latestPayload = payload;
    setStatusLine(payload);
    if (toggle.checked && payload.enabled) {
      await pi.processClockUpdate(payload);
    }
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(wsUrl());

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'LINK_CLOCK_UPDATE') {
          onClockMessage(data.payload);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      status.textContent = 'Link: Verbindung getrennt — reconnect…';
      status.classList.remove('link-status--live');
      pi.reset();
      reconnectTimer = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }

  function disconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    ws?.close();
    ws = null;
    pi.reset();
  }

  toggle.addEventListener('change', () => {
    pi.reset();
    if (toggle.checked && latestPayload?.enabled) {
      pi.processClockUpdate(latestPayload);
    }
  });

  connect();

  return { disconnect, getLatest: () => latestPayload };
}
