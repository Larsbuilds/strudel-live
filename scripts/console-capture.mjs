import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];
const scripts = [];
page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('.js') && (u.includes('strudel') || u.includes('chunk') || u.includes('node_modules')))
    scripts.push(u.split('/').slice(-2).join('/'));
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
console.log('--- scripts ---');
[...new Set(scripts)].sort().forEach((s) => console.log(s));
console.log('--- strudel logs ---');
for (const l of logs) {
  if (/strudel|loaded more than once/i.test(l.text)) console.log(`[${l.type}] ${l.text.slice(0, 120)}`);
}
await browser.close();
