import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'pattern';
}

export function savePattern({ code, name }) {
  const dir = join(process.cwd(), 'patterns', 'generated');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = slugify(name || 'ai-pattern');
  const filename = `${stamp}-${slug}.strudel`;
  const filepath = join(dir, filename);

  const header = `// Generated: ${new Date().toISOString()}\n// Prompt: ${name || '—'}\n\n`;
  writeFileSync(filepath, header + code.trim() + '\n', 'utf8');

  return { filename, filepath: `patterns/generated/${filename}` };
}
