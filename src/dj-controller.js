import { djState, updateDjCc } from './dj-state.js';

let midiAccess = null;
let meterIntervalId = null;
let lastMeterKey = '';

export async function initDjController() {
  const status = document.getElementById('dj-ctrl-status');
  const connectBtn = document.getElementById('dj-ctrl-connect');
  const meters = document.getElementById('dj-ctrl-meters');
  if (!connectBtn) return;

  if (!navigator.requestMIDIAccess) {
    if (status) status.textContent = 'Web MIDI nicht verfügbar — Chrome nutzen.';
    connectBtn.disabled = true;
    return;
  }

  connectBtn.addEventListener('click', async () => {
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      const inputs = [...midiAccess.inputs.values()];
      if (inputs.length === 0) {
        if (status) status.textContent = 'Kein MIDI-Input — DJ-Controller per USB verbinden.';
        return;
      }
      for (const input of inputs) {
        input.onmidimessage = onMidiMessage;
      }
      djState.connected = true;
      djState.deviceName = inputs.map((i) => i.name).join(', ');
      if (status) {
        status.textContent = `Verbunden: ${djState.deviceName}`;
        status.dataset.state = 'ok';
      }
      if (meters) {
        meters.hidden = false;
        renderMeters(meters);
      }
      if (!meterIntervalId) {
        meterIntervalId = setInterval(() => {
          if (djState.connected && meters && !meters.hidden) renderMeters(meters);
        }, 250);
      }
    } catch (err) {
      if (status) status.textContent = err.message;
    }
  });
}

function onMidiMessage(msg) {
  const [status, cc, value] = msg.data;
  if ((status & 0xf0) !== 0xb0) return;
  updateDjCc(cc, value / 127);
}

function renderMeters(el) {
  if (!el) return;
  const key = [
    djState.crossfader.toFixed(2),
    (djState.cc[1] ?? 0.5).toFixed(2),
    (djState.cc[2] ?? 0.5).toFixed(2),
  ].join('|');
  if (key === lastMeterKey) return;
  lastMeterKey = key;

  let cross = el.querySelector('[data-meter="xf"]');
  let lpfA = el.querySelector('[data-meter="lpf-a"]');
  let lpfB = el.querySelector('[data-meter="lpf-b"]');

  if (!cross) {
    el.innerHTML = `
      <div class="dj-meter">Crossfader (CC8): <meter data-meter="xf" min="0" max="1"></meter> <span data-meter="xf-label"></span></div>
      <div class="dj-meter">LPF A (CC1): <meter data-meter="lpf-a" min="0" max="1"></meter></div>
      <div class="dj-meter">LPF B (CC2): <meter data-meter="lpf-b" min="0" max="1"></meter></div>
    `;
    cross = el.querySelector('[data-meter="xf"]');
    lpfA = el.querySelector('[data-meter="lpf-a"]');
    lpfB = el.querySelector('[data-meter="lpf-b"]');
  }

  cross.value = djState.crossfader;
  lpfA.value = djState.cc[1] ?? 0.5;
  lpfB.value = djState.cc[2] ?? 0.5;
  const label = el.querySelector('[data-meter="xf-label"]');
  if (label) label.textContent = `${(djState.crossfader * 100).toFixed(0)}%`;
}
