/**
 * Boot optional server subsystems (Link, etc.)
 */
import { ensureLinkClock } from './link-clock.mjs';

let booted = false;

export async function bootServerServices(env = process.env) {
  if (booted) return;
  booted = true;
  await ensureLinkClock(env);
}
