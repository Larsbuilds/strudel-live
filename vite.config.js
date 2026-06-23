import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiMiddleware } from './server/api.mjs';
import { bootServerServices } from './server/boot.mjs';
import { attachLinkWebSocket } from './server/link-ws.mjs';

const root = dirname(fileURLToPath(import.meta.url));

function apiPlugin() {
  return {
    name: 'strudel-api',
    configureServer(server) {
      bootServerServices();
      server.middlewares.use(createApiMiddleware('development'));
    },
  };
}

function linkWsPlugin() {
  return {
    name: 'strudel-link-ws',
    configureServer(server) {
      attachLinkWebSocket(server.httpServer);
    },
  };
}

function patternsReloadPlugin() {
  return {
    name: 'patterns-reload',
    configureServer(server) {
      server.watcher.on('change', (file) => {
        if (!file.includes('/patterns/') || !file.endsWith('.strudel')) return;
        server.ws.send({ type: 'custom', event: 'strudel-live:patterns-changed' });
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin(), linkWsPlugin(), patternsReloadPlugin()],
  resolve: {
    alias: {
      '@strudel/core': resolve(root, 'node_modules/@strudel/core'),
    },
    dedupe: [
      '@strudel/core',
      '@strudel/mini',
      '@strudel/webaudio',
      '@strudel/draw',
      'tone',
    ],
  },
  optimizeDeps: {
    include: ['@strudel/repl', '@strudel/core', '@strudel/webaudio', 'tone'],
  },
  server: {
    port: 5173,
    open: false,
    watch: {
      ignored: [
        '**/.ui-capture/**',
        '**/.git/**',
        '**/patterns/generated/**',
        '**/samples/**',
      ],
    },
  },
});
