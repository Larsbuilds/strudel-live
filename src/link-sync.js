/**
 * Ableton Link UI — low-rate REST status; WebSocket only when PI sync is on.
 */
import { LinkPiSync } from './link-pi-sync.js';

const WS_PATH = '/api/link/ws';
const STATUS_POLL_MS = 5000;
const WS_THROTTLE_MS = 200;

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
  if (!toggle || !status) return { dispose() {} };

  const pi = new LinkPiSync(editor);
  let ws = null;
  let reconnectTimer = null;
  let statusPollId = null;
  let latestPayload = null;
  let lastStatusLine = '';
  let lastWsHandled = 0;
  let piBusy = false;

  let lastBeatInt = null;

  function setStatusLine(payload) {
    if (!payload?.available) {
      const line = payload?.error ? `Link: ${payload.error}` : 'Link: nicht verfügbar';
      if (line === lastStatusLine) return;
      lastStatusLine = line;
      lastBeatInt = null;
      status.textContent = line;
      status.classList.remove('link-status--live');
      return;
    }
    status.classList.add('link-status--live');
    const beatInt = Math.floor(payload.beat ?? 0);
    const peers = payload.peers > 0 ? ` · ${payload.peers} Peer(s)` : '';
    const line = payload.enabled
      ? `Link ${Math.round(payload.bpm)} BPM · Takt ${formatBeat(payload.beat)}${peers}`
      : `Link bereit · ${Math.round(payload.bpm)} BPM`;
    if (line === lastStatusLine && beatInt === lastBeatInt) return;
    lastStatusLine = line;
    lastBeatInt = beatInt;
    status.textContent = line;
  }

  async function applyPiSync(payload) {
    if (!toggle.checked || !payload?.enabled || piBusy) return;
    piBusy = true;
    try {
      await pi.processClockUpdate(payload);
    } finally {
      piBusy = false;
    }
  }

  function onClockPayload(payload) {
    latestPayload = payload;
    setStatusLine(payload);
    void applyPiSync(payload);
  }

  function onWsMessage(payload) {
    const now = performance.now();
    if (now - lastWsHandled < WS_THROTTLE_MS) return;
    lastWsHandled = now;
    onClockPayload(payload);
  }

  async function pollStatus() {
    try {
      const res = await fetch('/api/link');
      const data = await res.json();
      if (data.ok) onClockPayload(data);
    } catch {
      const line = 'Link: offline';
      if (lastStatusLine !== line) {
        lastStatusLine = line;
        status.textContent = line;
      }
    }
  }

  function connectWs() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

    ws = new WebSocket(wsUrl());

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'LINK_CLOCK_UPDATE') {
          onWsMessage(data.payload);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      ws = null;
      if (!toggle.checked) return;
      const line = 'Link: Verbindung getrennt — reconnect…';
      if (lastStatusLine !== line) {
        lastStatusLine = line;
        status.textContent = line;
      }
      status.classList.remove('link-status--live');
      pi.reset();
      reconnectTimer = setTimeout(connectWs, 3000);
    };

    ws.onerror = () => ws.close();
  }

  function disconnectWs() {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    ws?.close();
    ws = null;
    pi.reset();
  }

  function setPiMode(on) {
    if (on) connectWs();
    else disconnectWs();
  }

  toggle.addEventListener('change', () => {
    pi.reset();
    setPiMode(toggle.checked);
    if (toggle.checked && latestPayload?.enabled) {
      void applyPiSync(latestPayload);
    }
  });

  void pollStatus();
  statusPollId = setInterval(pollStatus, STATUS_POLL_MS);
  if (toggle.checked) setPiMode(true);

  return {
    disconnect: disconnectWs,
    getLatest: () => latestPayload,
    dispose() {
      clearInterval(statusPollId);
      disconnectWs();
    },
  };
}
