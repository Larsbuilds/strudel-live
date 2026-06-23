/**
 * Cycle phase + quantized wait with optional tick callback for UI cues.
 */
export function getCyclePhase(scheduler, bars = 1) {
  if (!scheduler?.started) return null;

  const cps = scheduler.cps || 0.5;
  const barSize = Math.max(1, bars);
  const now = scheduler.now();
  const nextBoundary = Math.ceil(now / barSize) * barSize;
  const cyclesLeft = Math.max(0, nextBoundary - now);
  const posInBar = (now % barSize) / barSize;
  const msLeft = (cyclesLeft / cps) * 1000;
  const beatInBar = Math.floor(posInBar * 4) % 4;
  const beatsUntilDrop = Math.min(4, Math.max(1, Math.ceil(cyclesLeft * 4 / barSize) || 1));

  return {
    now,
    posInBar,
    cyclesLeft,
    msLeft,
    beatInBar,
    beatsUntilDrop,
    cps,
    barSize,
  };
}

export async function waitForQuantizedBoundary(scheduler, bars = 1, { onTick } = {}) {
  if (!scheduler?.started) return { quantized: false, waitedMs: 0 };

  const barSize = Math.max(1, bars);
  const startMs = performance.now();

  await new Promise((resolve) => {
    const poll = () => {
      const phase = getCyclePhase(scheduler, barSize);
      if (phase) onTick?.(phase);

      const now = scheduler.now();
      const nextBoundary = Math.ceil(now / barSize) * barSize;
      const cyclesLeft = nextBoundary - now;

      if (cyclesLeft <= 0.02) {
        onTick?.({ ...phase, drop: true });
        resolve();
        return;
      }

      const cps = scheduler.cps || 0.5;
      const msLeft = (cyclesLeft / cps) * 1000;
      if (msLeft > 80) {
        setTimeout(poll, Math.max(16, msLeft - 60));
      } else {
        requestAnimationFrame(poll);
      }
    };
    poll();
  });

  return { quantized: true, waitedMs: Math.round(performance.now() - startMs) };
}

export function getReplScheduler(mirror) {
  return mirror?.repl?.scheduler ?? mirror?.editor?.repl?.scheduler ?? null;
}
