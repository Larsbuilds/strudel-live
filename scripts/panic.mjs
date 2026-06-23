#!/usr/bin/env node
/**
 * Remote panic — triggers browser NOT-AUS via POST /api/panic
 * npm run panic
 */
import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 5173;
const BASE = `http://localhost:${PORT}`;

try {
  const res = await fetch(`${BASE}/api/panic`, { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    console.log(`✓ Panic signal sent (${new Date(data.at).toISOString()})`);
    console.log('  Browser: Audio suspend → Strudel stop → Hydra schwarz');
  } else {
    console.error('✗', data.error || 'unknown error');
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ Dev-Server nicht erreichbar auf ${BASE}`);
  console.error('  Starte: npm run dev');
  process.exit(1);
}
