/** DJ controller state — updated from Web MIDI input (Phase 10). */

export const djState = {
  connected: false,
  deviceName: '',
  crossfader: 0.5,
  lpfA: 4000,
  lpfB: 4000,
  cc: {},
};

export function updateDjCc(num, value01) {
  djState.cc[num] = value01;
  if (num === 8) djState.crossfader = value01;
  if (num === 1) djState.lpfA = 200 + value01 * 7800;
  if (num === 2) djState.lpfB = 200 + value01 * 7800;
}
