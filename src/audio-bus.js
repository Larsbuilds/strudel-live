/** Shared master bus for WAM, mic monitor, RAVE — parallel to Strudel output. */
const buses = new WeakMap();

export function getMasterBus(audioContext) {
  if (!audioContext) return null;
  let bus = buses.get(audioContext);
  if (!bus) {
    bus = audioContext.createGain();
    bus.gain.value = 1;
    bus.connect(audioContext.destination);
    buses.set(audioContext, bus);
  }
  return bus;
}

export function connectToMaster(node, audioContext) {
  const bus = getMasterBus(audioContext);
  if (node && bus) node.connect(bus);
  return bus;
}

export function setMasterVolume(value, audioContext) {
  const bus = getMasterBus(audioContext);
  if (bus) bus.gain.value = Math.max(0, Math.min(1.5, value));
}
