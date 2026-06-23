import { defineConfig, loadEnv } from 'vite';
import { generateStrudel } from './server/generate.mjs';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function aiApiPlugin() {
  return {
    name: 'strudel-ai-api',
    configureServer(server) {
      server.middlewares.use('/api/generate', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        const env = loadEnv(server.config.mode, process.cwd(), '');
        try {
          const { prompt } = await readJsonBody(req);
          const result = await generateStrudel(prompt, env);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, ...result }));
        } catch (err) {
          const status = err.status || 500;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/status', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const env = loadEnv(server.config.mode, process.cwd(), '');
        const hasOpenAI = Boolean(env.OPENAI_API_KEY);
        const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY);
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            configured: hasOpenAI || hasAnthropic,
            providers: {
              openai: hasOpenAI,
              anthropic: hasAnthropic,
            },
          }),
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [aiApiPlugin()],
  server: {
    port: 5173,
    open: true,
  },
});
