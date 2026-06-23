import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (existsSync(envPath)) {
  console.log('.env exists already — edit it to add your API key.\n');
} else {
  copyFileSync(examplePath, envPath);
  console.log('Created .env from .env.example\n');
}

console.log('Next steps:');
console.log('  1. Open .env and set OPENAI_API_KEY (or ANTHROPIC_API_KEY)');
console.log('  2. npm run dev');
console.log('  3. Describe your sound in the browser → Generieren & Abspielen\n');
console.log('Get an OpenAI key: https://platform.openai.com/api-keys');
