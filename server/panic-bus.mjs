/**
 * Shared panic signal — POST /api/panic (CLI) + UI button.
 */
let lastPanicAt = 0;
const listeners = new Set();

export function triggerPanic() {
  lastPanicAt = Date.now();
  for (const fn of listeners) fn(lastPanicAt);
  return lastPanicAt;
}

export function getLastPanicAt() {
  return lastPanicAt;
}

export function onPanic(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
