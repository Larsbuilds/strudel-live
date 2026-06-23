import { defineConfig } from 'vite';
import { createApiMiddleware } from './server/api.mjs';

function apiPlugin() {
  return {
    name: 'strudel-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware('development'));
    },
  };
}

function patternsReloadPlugin() {
  return {
    name: 'patterns-reload',
    configureServer(server) {
      server.watcher.add('patterns/**/*.strudel');
      server.watcher.on('change', (file) => {
        if (file.includes('/patterns/')) {
          server.ws.send({ type: 'full-reload', path: '*' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin(), patternsReloadPlugin()],
  server: {
    port: 5173,
    open: true,
  },
});
