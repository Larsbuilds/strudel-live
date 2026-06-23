export function initSynthDefPanel() {
  const form = document.getElementById('synthdef-form');
  const promptEl = document.getElementById('synthdef-prompt');
  const codeEl = document.getElementById('synthdef-code');
  const sendBtn = document.getElementById('synthdef-send');
  const status = document.getElementById('synthdef-status');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptEl?.value?.trim();
    if (!prompt) return;
    if (status) status.textContent = 'KI schreibt SynthDef…';

    try {
      const res = await fetch('/api/synthdef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (codeEl) codeEl.value = data.code;
      if (sendBtn) sendBtn.disabled = false;
      if (status) {
        status.textContent = `SynthDef: ${data.synthName} — ${data.provider}/${data.model}${
          data.scAvailable ? '' : ' (sclang nicht gefunden)'
        }`;
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    }
  });

  sendBtn?.addEventListener('click', async () => {
    const code = codeEl?.value?.trim();
    if (!code) return;
    sendBtn.disabled = true;
    if (status) status.textContent = 'Sende an SuperCollider…';

    try {
      const res = await fetch('/api/synthdef/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || data.message);
      if (status) {
        status.textContent = data.message || `Gespeichert: ${data.file}`;
        status.dataset.state = 'ok';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      }
    } finally {
      sendBtn.disabled = false;
    }
  });
}
