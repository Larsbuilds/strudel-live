/** Toggle Hydra canvas between corner preview and fullscreen. */
export function initHydraView() {
  const btn = document.getElementById('hydra-expand-btn');
  if (!btn) return;

  let expanded = false;

  btn.addEventListener('click', () => {
    expanded = !expanded;
    document.body.classList.toggle('hydra-fullscreen', expanded);
    btn.textContent = expanded ? '⊟ Hydra klein' : '⊞ Hydra groß';
    btn.title = expanded ? 'Vorschau unten rechts' : 'Hydra Vollbild';
  });
}
