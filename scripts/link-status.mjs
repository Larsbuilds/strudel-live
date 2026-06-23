#!/usr/bin/env node
/**
 * Ableton Link Status (CLI) — npm run link:status
 */
import { config } from 'dotenv';
import { ensureLinkClock, getLinkState } from '../server/link-clock.mjs';

config();

await ensureLinkClock(process.env);

await new Promise((r) => setTimeout(r, 300));

const s = getLinkState();
console.log(JSON.stringify(s, null, 2));
process.exit(0);
