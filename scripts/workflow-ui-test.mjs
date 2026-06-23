import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../.ui-capture');
const BASE = 'http://localhost:5173/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

function snap(name) {
  return page.screenshot({ path: join(OUT, name), fullPage: true });
}

function pageInfo() {
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    innerH: window.innerHeight,
    bodyH: document.body.scrollHeight,
    headerVisible: document.querySelector('header')?.getBoundingClientRect(),
    mainVisible: document.querySelector('main')?.getBoundingClientRect(),
    canvases: [...document.querySelectorAll('canvas')].map((c) => {
      const s = getComputedStyle(c);
      return {
        w: c.width,
        h: c.height,
        z: s.zIndex,
        pos: s.position,
        top: c.getBoundingClientRect().top,
        opacity: s.opacity,
      };
    }),
    code: document.querySelector('strudel-editor')?.editor?.code?.slice(0, 300) || null,
    aiStatus: document.getElementById('ai-status')?.textContent,
  }));
}

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
let info = await pageInfo();
writeFileSync(join(OUT, 'workflow-state.json'), JSON.stringify({ step: 'initial', ...info }, null, 2));

await page.selectOption('#pattern-picker', { index: 2 });
await page.waitForTimeout(2000);
const play = page.locator('button[title*="lay" i], button').filter({ hasText: /^play$/i }).first();
if (await play.count()) await play.click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(2000);
await snap('workflow-preset.png');
info = await pageInfo();
writeFileSync(join(OUT, 'workflow-preset.json'), JSON.stringify(info, null, 2));

await page.fill('#ai-prompt', 'Hypnotic Deep Techno 128 BPM, dunkelrote Visuals, harte Kicks');
await page.click('#ai-submit');
await page.waitForTimeout(15000);
await snap('workflow-ignite.png');
info = await pageInfo();
writeFileSync(join(OUT, 'workflow-ignite.json'), JSON.stringify(info, null, 2));

// Can user scroll back to header?
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const afterScroll = await pageInfo();
writeFileSync(join(OUT, 'workflow-after-scroll.json'), JSON.stringify(afterScroll, null, 2));
await snap('workflow-after-scroll.png');

console.log(JSON.stringify({ preset: info.code, igniteStatus: info.aiStatus, canvases: info.canvases.length }, null, 2));
await browser.close();
