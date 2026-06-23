export async function initMidiPanel() {
  const list = document.getElementById('midi-devices');
  const refresh = document.getElementById('midi-refresh');
  if (!list) return;

  if (!navigator.requestMIDIAccess) {
    list.textContent = 'Web MIDI nicht unterstützt — Chrome nutzen.';
    return;
  }

  async function load() {
    try {
      const access = await navigator.requestMIDIAccess();
      const outputs = [...access.outputs.values()];
      list.innerHTML = '';
      if (outputs.length === 0) {
        list.textContent = 'Keine MIDI-Outputs — IAC Driver aktivieren? (docs/MIDI-MAC.md)';
        return;
      }
      const ul = document.createElement('ul');
      ul.className = 'midi-list';
      for (const out of outputs) {
        const li = document.createElement('li');
        li.innerHTML = `<code>${out.name}</code> — für Pattern: <code>.midi("${out.name}")</code>`;
        ul.append(li);
      }
      list.append(ul);
    } catch (err) {
      list.textContent = `MIDI-Fehler: ${err.message}`;
    }
  }

  refresh?.addEventListener('click', load);
  await load();
}
