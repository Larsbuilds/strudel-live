import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { handleApiRequest, getEnv } from './api.mjs';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 5173;

const app = express();
app.use(express.json({ limit: '15mb' }));

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  req.url = req.path;
  const env = getEnv('production');
  const handled = await handleApiRequest(req, res, env);
  if (handled) return;
  next();
});

app.use(express.static(dist));
app.get('*', (_req, res) => {
  res.sendFile(join(dist, 'index.html'));
});

app.listen(port, () => {
  console.log(`strudel-live → http://localhost:${port}`);
});
