/** Prevent duplicate listeners when modules hot-reload during dev. */
export function initOnce(key, fn) {
  const bag = (globalThis.__strudelLiveInits ??= new Set());
  if (bag.has(key)) return false;
  bag.add(key);
  fn();
  return true;
}

export function resetInits() {
  delete globalThis.__strudelLiveInits;
}
