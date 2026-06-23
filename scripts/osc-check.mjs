#!/usr/bin/env node
import { createConnection } from 'node:net';
import { config } from 'dotenv';

config();

const host = process.env.OSC_HOST || '127.0.0.1';
const port = Number(process.env.OSC_PORT) || 57120;

function checkPort() {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

console.log('Strudel Live — OSC / SuperDirt Check\n');

const oscUp = await checkPort();
if (oscUp) {
  console.log(`✓ Port ${port} offen — OSC-Server läuft vermutlich.`);
} else {
  console.log(`✗ Port ${port} geschlossen — SuperDirt/OSC nicht aktiv.`);
}

console.log(`
SuperDirt Setup (einmalig):
  1. SuperCollider installieren: https://supercollider.github.io/
  2. SuperDirt installieren (Tidal Docs)
  3. git clone https://codeberg.org/uzu/strudel.git && cd strudel
  4. pnpm i && pnpm run osc
  5. SuperCollider starten, SuperDirt booten
  6. Pattern mit .osc() oder REPL → Audio Engine Target: OSC

Details: docs/SUPERCOLLIDER.md
`);

process.exit(oscUp ? 0 : 1);
