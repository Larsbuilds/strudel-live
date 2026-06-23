import { djState, updateDjCc } from './dj-state.js';

const CC_CROSSFADER = 8;
const CC_LPF_A = 1;
const CC_LPF_B = 2;

let midiAccess = null;

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
      if (meters) meters.hidden = false;
      renderMeters(meters);
    } catch (err) {
      if (status) status.textContent = err.message;
    }
  });

  setInterval(() => {
    if (djState.connected && meters && !meters.hidden) renderMeters(meters);
  }, 100);
}

function onMidiMessage(msg) {
  const [status, cc, value] = msg.data;
  if ((status & 0xf0) !== 0xb0) return;
  updateDjCc(cc, value / 127);
}

function renderMeters(el) {
  if (!el) return;
  el.innerHTML = `
    <div class="dj-meter">Crossfader (CC8): <meter min="0" max="1" value="${djState.crossfader}"></meter> ${(djState.crossfader * 100).toFixed(0)}%</div>
    <div class="dj-meter">LPF A (CC1): <meter min="0" max="1" value="${djState.cc[1] ?? 0.5}"></meter></div>
    <div class="dj-meter">LPF B (CC2): <meter min="0" max="1" value="${djState.cc[2] ?? 0.5}"></meter></div>
  `;
}
