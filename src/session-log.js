/** Session change log — each Ignite / KI+ / Basis step with undo (×) and re-edit (✎). */

const SOURCE_LABEL = {
  ignite: 'Ignite',
  ai: 'KI+',
  preset: 'Basis',
  picker: 'Basis',
  restore: 'Undo',
};

let entries = [];
let hub = null;
let promptInput = null;

export function initSessionLog({ hub: h, promptInput: input }) {
  hub = h;
  promptInput = input;
  const list = document.getElementById('session-log-list');
  const empty = document.getElementById('session-log-empty');
  if (!list) return;

  window.addEventListener('strudel-live:session-log', (e) => {
    const d = e.detail || {};
    if (!d.code) return;
    entries.push({
      id: crypto.randomUUID(),
      prompt: d.prompt || d.name || '—',
      source: d.source || 'ai',
      name: d.name,
      fixes: d.fixes || [],
      code: d.code,
      prevCode: d.prevCode || '',
      at: Date.now(),
    });
    render(list, empty);
  });

  window.addEventListener('strudel-live:panic', () => {
    entries = [];
    render(list, empty);
  });

  document.getElementById('session-log-clear')?.addEventListener('click', () => {
    entries = [];
    render(list, empty);
  });
}

async function removeEntry(id) {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0 || !hub) return;

  const restore = idx > 0 ? entries[idx - 1].code : entries[idx].prevCode;
  entries = entries.slice(0, idx);

  const list = document.getElementById('session-log-list');
  const empty = document.getElementById('session-log-empty');
  render(list, empty);

  if (restore?.trim()) {
    await hub.applyPattern(restore, { source: 'restore', skipLog: true });
  }
}

function editEntry(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry || !promptInput) return;
  promptInput.value = entry.prompt;
  promptInput.focus();
  promptInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function render(list, empty) {
  if (!list) return;
  list.innerHTML = '';

  if (entries.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  for (const entry of [...entries].reverse()) {
    const li = document.createElement('li');
    li.className = 'session-log__item';
    li.dataset.source = entry.source;

    const badge = document.createElement('span');
    badge.className = 'session-log__badge';
    badge.textContent = SOURCE_LABEL[entry.source] || entry.source;

    const text = document.createElement('span');
    text.className = 'session-log__text';
    const fixHint = entry.fixes?.includes('refine:layer-merge') ? ' · Layer' : '';
    const intentHint = entry.intents?.length ? ` · ${entry.intents.join(', ')}` : '';
    text.textContent = `${entry.prompt.slice(0, 72)}${entry.prompt.length > 72 ? '…' : ''}${fixHint}${intentHint}`;
    text.title = entry.prompt;

    const actions = document.createElement('span');
    actions.className = 'session-log__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'session-log__btn';
    editBtn.title = 'Prompt erneut bearbeiten';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => editEntry(entry.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'session-log__btn session-log__btn--del';
    delBtn.title = 'Schritt rückgängig (Code davor)';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => removeEntry(entry.id));

    actions.append(editBtn, delBtn);
    li.append(badge, text, actions);
    list.append(li);
  }
}

export function getSessionEntries() {
  return [...entries];
}
